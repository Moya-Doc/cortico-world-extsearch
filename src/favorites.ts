/** Favorites are deployment data; each operation reads the file so external storage clearing takes effect immediately. */
import { randomUUID } from 'node:crypto';
import { mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { MarketEntry } from './market.ts';

export interface FavoriteEntry {
  name: string;
  entry: MarketEntry;
  indexBase: string;
  savedAt: string;
  updatedAt: string;
  status: 'saved' | 'missing' | 'blocked';
  reason?: string;
}

/** A package name identifies one favorite. Refresh preserves its original source and save time. */
export class ExtSearchFavorites {
  readonly file: string;

  constructor(dataDir: string, private readonly now: () => number = Date.now) {
    this.file = join(dataDir, 'extsearch', 'favorites.json');
  }

  list(): FavoriteEntry[] {
    let text: string;
    try {
      text = readFileSync(this.file, 'utf8');
    } catch (error) {
      if (hasCode(error, 'ENOENT')) return [];
      throw error;
    }
    let value: unknown;
    try {
      value = JSON.parse(text);
    } catch {
      throw new Error(`Favorites file is not valid JSON: ${this.file}`);
    }
    if (!object(value) || value.schema !== 1 || !Array.isArray(value.items) || !value.items.every(validFavorite)) {
      throw new Error(`Favorites file has an invalid schema: ${this.file}`);
    }
    const names = value.items.map((item) => item.name);
    if (new Set(names).size !== names.length) throw new Error(`Favorites file has duplicate package names: ${this.file}`);
    return value.items;
  }

  save(entry: MarketEntry, indexBase: string): FavoriteEntry {
    const items = this.list();
    const previous = items.find((item) => item.name === entry.name);
    const at = new Date(this.now()).toISOString();
    const item: FavoriteEntry = {
      name: entry.name,
      entry: structuredClone(entry),
      indexBase,
      savedAt: previous?.savedAt ?? at,
      updatedAt: at,
      status: 'saved',
    };
    if (previous) items[items.indexOf(previous)] = item;
    else items.unshift(item);
    this.write(items);
    return item;
  }

  remove(name: string): boolean {
    const items = this.list();
    const remaining = items.filter((item) => item.name !== name);
    if (remaining.length === items.length) return false;
    this.write(remaining);
    return true;
  }

  refresh(name: string, entry: MarketEntry | undefined, status: FavoriteEntry['status'], reason?: string): FavoriteEntry {
    const items = this.list();
    const index = items.findIndex((item) => item.name === name);
    if (index === -1) throw new Error(`Package is not saved: ${name}`);
    const previous = items[index];
    const item: FavoriteEntry = {
      ...previous,
      entry: status === 'saved' && entry ? structuredClone(entry) : previous.entry,
      updatedAt: new Date(this.now()).toISOString(),
      status,
    };
    delete item.reason;
    if (reason !== undefined) item.reason = reason;
    items[index] = item;
    this.write(items);
    return item;
  }

  clear(): void {
    try {
      unlinkSync(this.file);
    } catch (error) {
      if (!hasCode(error, 'ENOENT')) throw error;
    }
  }

  private write(items: FavoriteEntry[]): void {
    mkdirSync(dirname(this.file), { recursive: true });
    const temporary = `${this.file}.${randomUUID()}.tmp`;
    try {
      writeFileSync(temporary, JSON.stringify({ schema: 1, items }, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
      renameSync(temporary, this.file);
    } finally {
      try {
        unlinkSync(temporary);
      } catch (error) {
        if (!hasCode(error, 'ENOENT')) throw error;
      }
    }
  }
}

function hasCode(error: unknown, code: string): boolean {
  return object(error) && error.code === code;
}

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function strings(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function optionalStrings(value: Record<string, unknown>, keys: string[]): boolean {
  return keys.every((key) => value[key] === undefined || typeof value[key] === 'string');
}

function locale(value: unknown): boolean {
  return value === undefined || (object(value) && optionalStrings(value, ['displayName', 'description']));
}

function counts(value: unknown, keys: string[]): boolean {
  return value === undefined || (object(value) && keys.every((key) => value[key] === undefined ||
    (typeof value[key] === 'number' && Number.isFinite(value[key]))));
}

function validEntry(value: unknown): value is MarketEntry {
  if (!object(value)) return false;
  return typeof value.name === 'string' && value.name.length > 0 &&
    typeof value.kind === 'string' && ['world', 'provider', 'bot'].includes(value.kind) &&
    typeof value.version === 'string' && typeof value.description === 'string' &&
    strings(value.maintainers) && strings(value.keywords) && strings(value.tags) &&
    (value.os === undefined || strings(value.os)) &&
    typeof value.official === 'boolean' && typeof value.certified === 'boolean' && typeof value.isNew === 'boolean' &&
    object(value.links) && Object.values(value.links).every((link) => typeof link === 'string') &&
    optionalStrings(value, ['displayName', 'author', 'license', 'deprecated', 'supersededBy', 'published']) &&
    locale(value.zh) && locale(value.en) &&
    (value.note === undefined || typeof value.note === 'string' || (object(value.note) && optionalStrings(value.note, ['zh', 'en']))) &&
    counts(value.downloads, ['total', 'month', 'week']) && counts(value.summary, ['tools', 'events']) &&
    counts(value.rating, ['up', 'down', 'comments']);
}

function validDate(value: unknown): value is string {
  return typeof value === 'string' && Number.isFinite(Date.parse(value));
}

function validFavorite(value: unknown): value is FavoriteEntry {
  if (!object(value) || !validEntry(value.entry) || value.name !== value.entry.name ||
      typeof value.indexBase !== 'string' || !validDate(value.savedAt) || !validDate(value.updatedAt) ||
      typeof value.status !== 'string' || !['saved', 'missing', 'blocked'].includes(value.status) ||
      (value.reason !== undefined && typeof value.reason !== 'string')) return false;
  try {
    const url = new URL(value.indexBase);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}
