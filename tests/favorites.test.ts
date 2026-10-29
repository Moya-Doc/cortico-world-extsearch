import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { ExtSearchFavorites } from '../src/favorites.ts';
import type { MarketEntry } from '../src/market.ts';

let dataDir: string;
beforeEach(() => { dataDir = mkdtempSync(join(tmpdir(), 'extsearch-favorites-')); });
afterEach(() => { rmSync(dataDir, { recursive: true, force: true }); });

const base = 'https://index.example.test/main';
const entry: MarketEntry = {
  name: 'cortico-world-board', kind: 'world', version: '1.0.0', description: 'Play board games',
  maintainers: ['sample-author'], keywords: ['board'], tags: ['game'],
  official: false, certified: false, isNew: true, links: { repository: 'https://example.test/board' },
};

describe('favorites storage', () => {
  it('constructs and lists an empty store without creating files', () => {
    const store = new ExtSearchFavorites(dataDir);
    expect(store.list()).toEqual([]);
    expect(readdirSync(dataDir)).toEqual([]);
    expect(store.remove('missing-package')).toBe(false);
    expect(readdirSync(dataDir)).toEqual([]);
  });

  it('keeps a snapshot across instances and removes a saved package', () => {
    const store = new ExtSearchFavorites(dataDir, () => 1000);
    const saved = store.save(entry, base);
    expect(new ExtSearchFavorites(dataDir).list()).toEqual([saved]);
    expect(saved.entry).toEqual(entry);
    expect(saved.indexBase).toBe(base);
    expect(saved.savedAt).toBe(new Date(1000).toISOString());
    expect(saved.status).toBe('saved');
    expect(store.remove(entry.name)).toBe(true);
    expect(new ExtSearchFavorites(dataDir).list()).toEqual([]);
    expect(store.remove(entry.name)).toBe(false);
  });

  it('updates duplicate snapshots while retaining the original save time', () => {
    let at = 1000;
    const store = new ExtSearchFavorites(dataDir, () => at);
    const first = store.save(entry, base);
    at = 2000;
    const next = store.save({ ...entry, version: '1.1.0' }, base);
    expect(store.list()).toEqual([next]);
    expect(next.savedAt).toBe(first.savedAt);
    expect(next.updatedAt).toBe(new Date(at).toISOString());
    expect(next.entry.version).toBe('1.1.0');
    expect(readdirSync(dirname(store.file))).toEqual(['favorites.json']);
  });

  it('preserves snapshots when missing or blocked and replaces them after recovery', () => {
    let at = 1000;
    const store = new ExtSearchFavorites(dataDir, () => at);
    const first = store.save(entry, base);
    at = 2000;
    const missing = store.refresh(entry.name, undefined, 'missing');
    expect(missing.entry).toEqual(entry);
    expect(missing.status).toBe('missing');
    const blocked = store.refresh(entry.name, undefined, 'blocked', 'Removed by index maintainer');
    expect(blocked.entry).toEqual(entry);
    expect(blocked.reason).toBe('Removed by index maintainer');
    const refreshed = store.refresh(entry.name, { ...entry, version: '2.0.0' }, 'saved');
    expect(refreshed.reason).toBeUndefined();
    expect(refreshed.entry.version).toBe('2.0.0');
    expect(refreshed.savedAt).toBe(first.savedAt);
    expect(refreshed.indexBase).toBe(first.indexBase);
    expect(new ExtSearchFavorites(dataDir).list()).toEqual([refreshed]);
    expect(() => store.refresh('unknown-package', undefined, 'missing')).toThrow('not saved');
  });

  it('does not retain mutated return values or caller objects', () => {
    const store = new ExtSearchFavorites(dataDir);
    const input = structuredClone(entry);
    const saved = store.save(input, base);
    input.tags.push('changed');
    saved.entry.tags.push('changed-again');
    store.list()[0].entry.tags.push('third-change');
    expect(store.list()[0].entry).toEqual(entry);
  });

  it('observes external file deletion and clearing without restoring stale data', () => {
    const store = new ExtSearchFavorites(dataDir);
    store.save(entry, base);
    unlinkSync(store.file);
    expect(store.list()).toEqual([]);
    store.save({ ...entry, name: 'cortico-world-second' }, base);
    expect(store.list().map((item) => item.name)).toEqual(['cortico-world-second']);
    store.clear();
    store.clear();
    expect(existsSync(store.file)).toBe(false);
    expect(store.list()).toEqual([]);
  });

  it.each([
    '{invalid json',
    JSON.stringify({ schema: 2, items: [] }),
    JSON.stringify({ schema: 1, items: [{ name: entry.name }] }),
  ])('leaves malformed saved data unchanged when operations fail: %s', (contents) => {
    const store = new ExtSearchFavorites(dataDir);
    mkdirSync(dirname(store.file), { recursive: true });
    writeFileSync(store.file, contents);
    expect(() => store.list()).toThrow('Favorites file');
    expect(() => store.save(entry, base)).toThrow('Favorites file');
    expect(() => store.remove(entry.name)).toThrow('Favorites file');
    expect(readFileSync(store.file, 'utf8')).toBe(contents);
  });

  it('rejects malformed snapshot fields and duplicate package names', () => {
    const store = new ExtSearchFavorites(dataDir);
    const saved = store.save(entry, base);
    for (const items of [
      [{ ...saved, entry: { ...entry, tags: [1] } }],
      [{ ...saved, entry: { ...entry, kind: ['world'] } }],
      [{ ...saved, status: ['saved'] }],
      [saved, saved],
    ]) {
      const contents = JSON.stringify({ schema: 1, items });
      writeFileSync(store.file, contents);
      expect(() => store.save(entry, base)).toThrow('Favorites file');
      expect(readFileSync(store.file, 'utf8')).toBe(contents);
    }
  });

  it('reports filesystem read errors without replacing the unreadable path', () => {
    const store = new ExtSearchFavorites(dataDir);
    mkdirSync(store.file, { recursive: true });
    writeFileSync(join(store.file, 'marker'), 'keep');
    expect(() => store.list()).toThrow();
    expect(() => store.save(entry, base)).toThrow();
    expect(readFileSync(join(store.file, 'marker'), 'utf8')).toBe('keep');
  });
});
