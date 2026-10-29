import type { WebUiClientBundle, WebUiPanelContext } from 'cortico/web/shared/client-panel.ts';
import type { FavoriteEntry } from '../src/favorites.ts';
import { extSearchStrings } from '../src/strings.ts';
import './style.css';

export interface FavoritesPanelState {
  favorites: FavoriteEntry[];
}

function linkUrl(value: string): string | null {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password ? url.href : null;
  } catch {
    return null;
  }
}

export function mountFavorites(ctx: WebUiPanelContext) {
  const t = extSearchStrings(ctx.language);
  const doc = ctx.root.ownerDocument;
  const h = <K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text?: string): HTMLElementTagNameMap[K] => {
    const node = doc.createElement(tag);
    node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const button = (label: string, action: string) => {
    const node = h('button', 'extsearch-button', label);
    node.type = 'button';
    node.dataset.action = action;
    return node;
  };
  const panel = h('section', 'extsearch-favorites');
  const header = h('header', 'extsearch-header');
  const title = h('h2', '', t.favoritesTitle);
  const count = h('span', 'extsearch-count');
  const reload = button(t.reload, 'reload');
  header.append(title, count, reload);
  const filterLabel = h('label', 'extsearch-filter');
  const filter = h('input', 'extsearch-input');
  filter.type = 'search';
  filter.placeholder = t.filter;
  filterLabel.append(h('span', 'extsearch-muted', t.filter), filter);
  const error = h('p', 'extsearch-error');
  error.setAttribute('role', 'alert');
  error.hidden = true;
  const empty = h('p', 'extsearch-empty', t.loading);
  empty.setAttribute('role', 'status');
  const cards = h('div', 'extsearch-cards');
  panel.append(header, filterLabel, error, empty, cards);
  ctx.root.append(panel);

  let disposed = false;
  let revision = 0;
  let reading = false;
  let mutating = false;
  let loaded = false;
  let actionFailed = false;
  let state: FavoritesPanelState = { favorites: [] };
  const mounted = new Map<string, { node: HTMLElement; signature: string; search: string }>();
  const active = () => !disposed && !ctx.signal.aborted;
  const dateText = (value: string) => new Date(value).toLocaleString(ctx.language === 'zh' ? 'zh-CN' : ctx.language);
  const searchText = (item: FavoriteEntry) => [item.name, item.entry.displayName, item.entry.zh?.displayName, item.entry.en?.displayName,
    item.entry.description, item.entry.zh?.description, item.entry.en?.description, ...item.entry.tags].filter(Boolean).join('\n').normalize('NFKC').toLocaleLowerCase();

  function updateButtons() {
    for (const node of panel.querySelectorAll<HTMLButtonElement>('button')) node.disabled = mutating;
    reload.disabled = mutating || reading;
    panel.setAttribute('aria-busy', String(mutating || (!loaded && reading)));
  }

  function showError(cause: unknown) {
    error.textContent = `${t.error}: ${cause instanceof Error ? cause.message : String(cause)}`;
    error.hidden = false;
  }

  function applyFilter() {
    const query = filter.value.trim().normalize('NFKC').toLocaleLowerCase();
    let visible = 0;
    for (const card of mounted.values()) {
      card.node.hidden = !!query && !card.search.includes(query);
      if (!card.node.hidden) visible++;
    }
    count.textContent = query ? `${visible} / ${state.favorites.length}` : String(state.favorites.length);
    empty.hidden = visible > 0 || !loaded;
    empty.textContent = state.favorites.length === 0 ? t.empty : t.noResults;
  }

  function card(item: FavoriteEntry): HTMLElement {
    const entry = item.entry;
    const locale = ctx.language === 'zh' || ctx.language === 'zh-Hant' ? entry.zh : entry.en;
    const name = locale?.displayName || entry.displayName || item.name;
    const node = h('article', 'extsearch-card');
    node.dataset.name = item.name;
    const heading = h('div', 'extsearch-card-heading');
    const monogram = h('span', 'extsearch-monogram', name.slice(0, 1).toLocaleUpperCase());
    monogram.setAttribute('aria-hidden', 'true');
    const identity = h('div', 'extsearch-identity');
    identity.append(h('h3', '', name), h('code', 'extsearch-package', item.name));
    heading.append(monogram, identity);
    const badges = h('div', 'extsearch-badges');
    const badge = (label: string) => badges.append(h('span', 'extsearch-badge', label));
    badge(entry.kind);
    if (entry.version) badge(`v${entry.version}`);
    if (entry.official) badge(t.official);
    if (entry.certified) badge(t.certified);
    if (entry.deprecated) badge(t.deprecated);
    for (const tag of entry.tags) badge(tag);
    const description = h('p', 'extsearch-description', locale?.description || entry.description);
    node.append(heading, badges, description);
    if (entry.author) node.append(h('p', 'extsearch-meta', `${t.author}: ${entry.author}`));
    if (entry.os?.length) node.append(h('p', 'extsearch-meta', `${t.platforms}: ${entry.os.join(', ')}`));
    if (item.status !== 'saved') {
      const warning = h('p', 'extsearch-warning', item.status === 'missing' ? t.missing : t.blocked);
      if (item.reason) warning.append(doc.createTextNode(`: ${item.reason}`));
      node.append(warning);
    }
    const dates = h('div', 'extsearch-dates');
    dates.append(h('p', '', `${t.savedAt}: ${dateText(item.savedAt)}`), h('p', '', `${t.updatedAt}: ${dateText(item.updatedAt)}`));
    const snapshot = h('span', 'extsearch-muted', t.snapshot);
    snapshot.title = item.indexBase;
    dates.append(snapshot);
    node.append(dates);
    const links = h('nav', 'extsearch-links');
    links.setAttribute('aria-label', t.links);
    for (const [label, value] of Object.entries(entry.links)) {
      const href = linkUrl(value);
      if (!href) continue;
      const link = h('a', '', label);
      link.href = href;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      links.append(link);
    }
    if (links.childElementCount) node.append(links);
    const actions = h('div', 'extsearch-actions');
    const refresh = button(t.refresh, 'refresh');
    const remove = button(t.remove, 'remove');
    refresh.onclick = () => { void mutate('refresh', item.name); };
    remove.onclick = () => { void mutate('remove', item.name); };
    actions.append(refresh, remove);
    node.append(actions);
    return node;
  }

  function render(next: FavoritesPanelState) {
    state = next;
    loaded = true;
    const names = new Set(next.favorites.map(item => item.name));
    for (const [name, old] of mounted) {
      if (!names.has(name)) {
        const focused = old.node.contains(doc.activeElement);
        old.node.remove();
        mounted.delete(name);
        if (focused) filter.focus();
      }
    }
    next.favorites.forEach((item, index) => {
      const signature = JSON.stringify(item);
      const old = mounted.get(item.name);
      if (old?.signature !== signature) {
        const focusAction = old?.node.contains(doc.activeElement) ? (doc.activeElement as HTMLElement).dataset.action : undefined;
        const node = card(item);
        if (old) old.node.replaceWith(node);
        mounted.set(item.name, { node, signature, search: searchText(item) });
        if (focusAction) node.querySelector<HTMLButtonElement>(`button[data-action="${focusAction}"]`)?.focus();
      }
      const node = mounted.get(item.name)!.node;
      if (cards.children[index] !== node) cards.insertBefore(node, cards.children[index] ?? null);
    });
    applyFilter();
    updateButtons();
  }

  async function read(manual = false) {
    if (!active() || reading || mutating) return;
    reading = true;
    const current = ++revision;
    if (manual) actionFailed = false;
    updateButtons();
    try {
      const next = await ctx.invoke<FavoritesPanelState>('list', []);
      if (!active() || current !== revision) return;
      render(next);
      if (!actionFailed) error.hidden = true;
    } catch (cause) {
      if (!active() || current !== revision) return;
      if (!actionFailed) showError(cause);
      if (!loaded) empty.hidden = true;
    } finally {
      reading = false;
      if (active()) updateButtons();
    }
  }

  async function mutate(method: 'remove' | 'refresh', name: string) {
    if (!active() || mutating) return;
    mutating = true;
    const current = ++revision;
    actionFailed = false;
    error.hidden = true;
    updateButtons();
    try {
      const next = await ctx.invoke<FavoritesPanelState>(method, [name]);
      if (!active() || current !== revision) return;
      render(next);
    } catch (cause) {
      if (!active() || current !== revision) return;
      actionFailed = true;
      showError(cause);
    } finally {
      mutating = false;
      if (active()) updateButtons();
    }
  }

  filter.addEventListener('input', applyFilter, { signal: ctx.signal });
  reload.onclick = () => { void read(true); };
  const poll = ctx.interval(() => { void read(); }, 3000);
  void read();
  return { dispose() { disposed = true; revision++; poll.dispose(); } };
}

export default { panels: { favorites: { mount: mountFavorites } } } satisfies WebUiClientBundle;
