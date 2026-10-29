import { JSDOM } from 'jsdom';
import { afterEach, describe, expect, it } from 'vitest';
import type { WebUiPanelContext } from 'cortico/web/shared/client-panel.ts';
import { LANGUAGES } from 'cortico/core/language.ts';
import type { FavoriteEntry } from '../src/favorites.ts';
import { extSearchStrings } from '../src/strings.ts';
import { mountFavorites, type FavoritesPanelState } from '../webui/client.ts';

const cleanup: Array<() => void> = [];
afterEach(() => { while (cleanup.length) cleanup.pop()!(); });
const settle = async () => { await new Promise(resolve => setTimeout(resolve, 0)); };

function favorite(name: string, description = 'Saved extension description'): FavoriteEntry {
  return {
    name, indexBase: 'https://index.example.test', savedAt: '2026-10-20T12:00:00.000Z', updatedAt: '2026-10-20T12:00:00.000Z', status: 'saved',
    entry: { name, displayName: name.replace('cortico-world-', ''), kind: 'world', version: '1.0.0', description, tags: ['games'],
      maintainers: [], keywords: [], official: false, certified: false, isNew: false, links: { repository: 'https://code.example.test/package' } },
  };
}

function harness(items: FavoriteEntry[] = []) {
  const dom = new JSDOM('<main></main>', { url: 'https://panel.example.test/' });
  const root = dom.window.document.querySelector('main')!;
  const abort = new dom.window.AbortController();
  let state: FavoritesPanelState = { favorites: items };
  let poll = () => {};
  let pollStopped = false;
  let listRequest: Promise<FavoritesPanelState> | undefined;
  let actionRequest: Promise<FavoritesPanelState> | undefined;
  let failure = '';
  const ctx = {
    root, signal: abort.signal, language: 'en',
    async invoke(method: string, args: unknown[]) {
      if (method === 'list') return listRequest ?? structuredClone(state);
      if (failure) throw new Error(failure);
      if (actionRequest) return actionRequest;
      if (method === 'remove') state.favorites = state.favorites.filter(item => item.name !== args[0]);
      if (method === 'refresh') {
        const item = state.favorites.find(item => item.name === args[0])!;
        item.entry.version = '2.0.0';
        item.updatedAt = '2026-10-30T12:00:00.000Z';
      }
      return structuredClone(state);
    },
    interval(fn: () => void) { poll = fn; return { dispose() { pollStopped = true; } }; },
  } as unknown as WebUiPanelContext;
  const mounted = mountFavorites(ctx);
  cleanup.push(() => { abort.abort(); mounted.dispose(); dom.window.close(); });
  return {
    dom, root, abort, mounted,
    get state() { return state; },
    set state(value: FavoritesPanelState) { state = value; },
    set listRequest(value: Promise<FavoritesPanelState> | undefined) { listRequest = value; },
    set actionRequest(value: Promise<FavoritesPanelState> | undefined) { actionRequest = value; },
    set failure(value: string) { failure = value; },
    get pollStopped() { return pollStopped; },
    poll: () => poll(),
    action(name: string, action: string) {
      const card = Array.from(root.querySelectorAll<HTMLElement>('.extsearch-card')).find(node => node.dataset.name === name)!;
      return card.querySelector<HTMLButtonElement>(`button[data-action="${action}"]`)!;
    },
  };
}

describe('favorites panel', () => {
  it('renders loading, empty and new favorites received while open', async () => {
    const h = harness();
    expect(h.root.textContent).toContain('Loading favorites');
    await settle();
    expect(h.root.textContent).toContain('No favorites yet');
    h.state.favorites.push(favorite('cortico-world-board'));
    h.poll();
    await settle();
    expect(h.root.querySelectorAll('.extsearch-card')).toHaveLength(1);
    expect(h.root.textContent).toContain('board');
    expect(h.root.querySelector<HTMLElement>('.extsearch-empty')!.hidden).toBe(true);
  });

  it('treats index text as text and excludes script and credential links', async () => {
    const item = favorite('cortico-world-board', '<img src=x onerror=alert(1)>');
    item.entry.links = { repository: 'https://code.example.test/repo', attack: 'javascript:alert(1)', credentials: 'https://user:pass@example.test/' };
    const h = harness([item]);
    await settle();
    expect(h.root.querySelector('img')).toBeNull();
    expect(h.root.textContent).toContain('<img src=x onerror=alert(1)>');
    const links = h.root.querySelectorAll('a');
    expect(links).toHaveLength(1);
    expect(links[0].rel).toBe('noopener noreferrer');
    expect(links[0].target).toBe('_blank');
  });

  it('filters locally and keeps focused input and unchanged cards during polling', async () => {
    const h = harness([favorite('cortico-world-board'), favorite('cortico-world-speech')]);
    await settle();
    const input = h.root.querySelector('input')!;
    const before = h.root.querySelector('.extsearch-card');
    input.focus();
    input.value = 'board';
    input.dispatchEvent(new h.dom.window.Event('input'));
    h.poll();
    await settle();
    expect(h.dom.window.document.activeElement).toBe(input);
    expect(input.value).toBe('board');
    expect(h.root.querySelector('.extsearch-card')).toBe(before);
    expect(h.root.querySelectorAll('.extsearch-card:not([hidden])')).toHaveLength(1);
    input.value = 'no-such-extension';
    input.dispatchEvent(new h.dom.window.Event('input'));
    expect(h.root.querySelector<HTMLElement>('.extsearch-empty')!.hidden).toBe(false);
    expect(h.root.textContent).toContain('No matching favorites');
  });

  it('refreshes the selected card and removes favorites without losing other cards', async () => {
    const one = favorite('cortico-world-board');
    const two = favorite('cortico-world-speech');
    const h = harness([one, two]);
    await settle();
    const other = h.action(two.name, 'remove').closest('.extsearch-card');
    h.action(one.name, 'refresh').click();
    await settle();
    expect(h.root.textContent).toContain('v2.0.0');
    expect(h.action(two.name, 'remove').closest('.extsearch-card')).toBe(other);
    h.action(one.name, 'remove').click();
    await settle();
    expect(h.root.querySelectorAll('.extsearch-card')).toHaveLength(1);
    expect(h.root.textContent).not.toContain(one.name);
  });

  it('keeps a failed refresh error and stored card visible across a successful list poll', async () => {
    const item = favorite('cortico-world-board');
    const h = harness([item]);
    await settle();
    h.failure = 'Index is unavailable';
    h.action(item.name, 'refresh').click();
    await settle();
    h.poll();
    await settle();
    expect(h.root.querySelector<HTMLElement>('[role="alert"]')!.hidden).toBe(false);
    expect(h.root.textContent).toContain('Index is unavailable');
    expect(h.root.textContent).toContain('v1.0.0');
    expect(h.action(item.name, 'refresh').disabled).toBe(false);
  });

  it('does not restore a removed favorite from an older in-flight list response', async () => {
    const item = favorite('cortico-world-board');
    const h = harness([item]);
    await settle();
    let resolveList!: (state: FavoritesPanelState) => void;
    h.listRequest = new Promise(resolve => { resolveList = resolve; });
    h.poll();
    h.action(item.name, 'remove').click();
    await settle();
    resolveList({ favorites: [item] });
    await settle();
    expect(h.root.querySelectorAll('.extsearch-card')).toHaveLength(0);
    expect(h.root.textContent).toContain('No favorites yet');
  });

  it('does not change the DOM after disposal when an action finishes', async () => {
    const item = favorite('cortico-world-board');
    const h = harness([item]);
    await settle();
    let resolveAction!: (state: FavoritesPanelState) => void;
    h.actionRequest = new Promise(resolve => { resolveAction = resolve; });
    h.action(item.name, 'remove').click();
    h.abort.abort();
    h.mounted.dispose();
    const previous = h.root.innerHTML;
    resolveAction({ favorites: [] });
    await settle();
    expect(h.root.innerHTML).toBe(previous);
    expect(h.pollStopped).toBe(true);
  });

  it('shows blocked and missing states with their saved information', async () => {
    const blocked = { ...favorite('cortico-world-board'), status: 'blocked' as const, reason: 'Publisher removed' };
    const missing = { ...favorite('cortico-world-speech'), status: 'missing' as const };
    const h = harness([blocked, missing]);
    await settle();
    expect(h.root.textContent).toContain('Blocked by market: Publisher removed');
    expect(h.root.textContent).toContain('Not found in index');
    expect(h.root.querySelectorAll('.extsearch-card')).toHaveLength(2);
  });

  it('provides every interface label in each supported language', () => {
    const keys = Object.keys(extSearchStrings('en'));
    for (const language of LANGUAGES) {
      const labels = extSearchStrings(language);
      expect(Object.keys(labels)).toEqual(keys);
      for (const value of Object.values(labels)) expect(value.trim()).not.toBe('');
    }
  });

  it('shows declared platforms as colored tags and respects exclusions', async () => {
    const windows = favorite('cortico-world-window'); windows.entry.os = ['win32'];
    const multi = favorite('cortico-world-multi'); multi.entry.os = ['darwin', 'linux'];
    const excluded = favorite('cortico-world-excluded'); excluded.entry.os = ['!win32'];
    const conflict = favorite('cortico-world-conflict'); conflict.entry.os = ['win32', '!win32'];
    const unknown = favorite('cortico-world-other'); unknown.entry.os = ['freebsd'];
    const unrestricted = favorite('cortico-world-any'); unrestricted.entry.os = ['any'];
    const h = harness([windows, multi, excluded, conflict, unknown, unrestricted, favorite('cortico-world-unspecified')]);
    await settle();
    const tags = (name: string) => h.action(name, 'remove').closest('.extsearch-card')!.querySelectorAll<HTMLElement>('.extsearch-platform');
    expect([...tags(windows.name)].map(tag => tag.textContent)).toEqual(['Windows']);
    expect(tags(windows.name)[0].classList.contains('extsearch-platform-windows')).toBe(true);
    expect([...tags(multi.name)].map(tag => tag.textContent)).toEqual(['macOS', 'Linux']);
    expect([...tags(excluded.name)].map(tag => tag.textContent)).toEqual(['macOS', 'Linux', extSearchStrings('en').platformExcluded.replace('{platform}', 'Windows')]);
    expect([...tags(conflict.name)].map(tag => tag.textContent)).toEqual([extSearchStrings('en').platformExcluded.replace('{platform}', 'Windows')]);
    expect([...tags(unknown.name)].map(tag => tag.textContent)).toEqual(['freebsd']);
    for (const name of [unrestricted.name, 'cortico-world-unspecified']) {
      expect([...tags(name)].map(tag => tag.textContent)).toEqual([extSearchStrings('en').platformsUnspecified]);
    }
    const input = h.root.querySelector('input')!;
    input.value = 'macOS';
    input.dispatchEvent(new h.dom.window.Event('input'));
    expect(h.root.querySelectorAll('.extsearch-card:not([hidden])')).toHaveLength(2);
  });
});
