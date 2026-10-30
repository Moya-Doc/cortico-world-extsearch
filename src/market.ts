/**
 * 读官方扩展索引:`catalog.json`(包列表)与 `index.json`(拉黑名单、标签词表、官方覆盖)。
 * 文件格式以索引仓的 DESIGN.md 为准;这里只取搜索与详情要用的字段,缺字段的包照常收下。
 * 只发 GET,不带任何令牌;结果只留在内存里。
 */

/** 只用到 fetch 的这一小部分,测试注入假的。 */
export type FetchLike = (
  url: string,
  init: { signal: AbortSignal; headers: Record<string, string> },
) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;

export type Kind = 'world' | 'provider' | 'bot';
export const KINDS: readonly Kind[] = ['world', 'provider', 'bot'];

export interface LocaleText {
  displayName?: string;
  description?: string;
}

/** 双语文案;索引里有的地方只给一个字符串。 */
export type BiText = string | { zh?: string; en?: string };

export interface MarketEntry {
  name: string;
  kind: Kind;
  version: string;
  displayName?: string;
  description: string;
  zh?: LocaleText;
  en?: LocaleText;
  author?: string;
  maintainers: string[];
  license?: string;
  keywords: string[];
  /** 官方标签之外,合上粘住名单与官方 addTags,去掉官方 removeTags。 */
  tags: string[];
  os?: string[];
  official: boolean;
  certified: boolean;
  isNew: boolean;
  deprecated?: string;
  note?: BiText;
  supersededBy?: string;
  published?: string;
  links: Record<string, string>;
  downloads?: { total?: number; month?: number; week?: number };
  summary?: { tools?: number; events?: number };
  rating?: { up?: number; down?: number; comments?: number };
}

export interface TagInfo {
  zh?: string;
  en?: string;
}

export interface MarketSnapshot {
  base: string;
  /** 未被拉黑的包。 */
  entries: MarketEntry[];
  /** 被拉黑的包名 → 原因;搜索不列它们,详情只报原因。 */
  blocked: Map<string, BiText>;
  tagLabels: Map<string, TagInfo>;
  /** 这次刷新失败、用的是内存里上一份时,写失败原因。 */
  stale?: string;
}

export interface MarketIndexOptions {
  fetch?: FetchLike;
  now?: () => number;
  ttlMs?: number;
  timeoutMs?: number;
}

const DEFAULT_TTL_MS = 10 * 60_000;
const DEFAULT_TIMEOUT_MS = 5_000;

/** 检查并规整索引源地址:只收 http(s),去掉末尾的 `/`。不合格时抛错。 */
export function normalizeBase(raw: unknown): string {
  const text = typeof raw === 'string' ? raw.trim() : '';
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    throw new Error(`indexBase is not a valid URL: "${text}"`);
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(`indexBase must be an http(s) address: "${text}"`);
  }
  return text.replace(/\/+$/, '');
}

export class MarketIndex {
  private readonly fetchImpl: FetchLike;
  private readonly now: () => number;
  private readonly ttlMs: number;
  private readonly timeoutMs: number;
  private cache: { snapshot: MarketSnapshot; at: number } | null = null;

  constructor(opts: MarketIndexOptions = {}) {
    this.fetchImpl = opts.fetch ?? (globalThis.fetch as unknown as FetchLike);
    this.now = opts.now ?? Date.now;
    this.ttlMs = opts.ttlMs ?? DEFAULT_TTL_MS;
    this.timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  /** 取索引快照;过期才重新请求,请求失败时退回同一索引源的上一份。 */
  async load(base: string, refresh = false): Promise<MarketSnapshot> {
    const cached = this.cache?.snapshot.base === base ? this.cache : null;
    if (!refresh && cached && this.now() - cached.at < this.ttlMs) return cached.snapshot;
    try {
      const [index, catalog] = await Promise.all([
        this.getJson(`${base}/index.json`),
        this.getJson(`${base}/catalog.json`),
      ]);
      const snapshot = buildSnapshot(base, index, catalog);
      this.cache = { snapshot, at: this.now() };
      return snapshot;
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      if (cached) return { ...cached.snapshot, stale: reason };
      throw new Error(reason);
    }
  }

  private async getJson(url: string): Promise<Record<string, unknown>> {
    const host = new URL(url).host;
    let res: Awaited<ReturnType<FetchLike>>;
    try {
      res = await this.fetchImpl(url, {
        signal: AbortSignal.timeout(this.timeoutMs),
        headers: { accept: 'application/json' },
      });
    } catch (error) {
      const code = errorCode(error);
      throw new Error(`${host}: request for ${lastSegment(url)} failed (${code})`);
    }
    if (!res.ok) throw new Error(`${host}: ${lastSegment(url)} returned HTTP ${res.status}`);
    let body: unknown;
    try {
      body = await res.json();
    } catch {
      throw new Error(`${host}: ${lastSegment(url)} is not JSON`);
    }
    if (!isObject(body) || body.schema !== 1) {
      throw new Error(`${host}: ${lastSegment(url)} is not a schema 1 index file`);
    }
    return body;
  }
}

function buildSnapshot(base: string, index: Record<string, unknown>, catalog: Record<string, unknown>): MarketSnapshot {
  const blockedSection = isObject(index.blocked) ? index.blocked : {};
  const blocked = new Map<string, BiText>();
  if (isObject(blockedSection.packages)) {
    for (const [name, reason] of Object.entries(blockedSection.packages)) blocked.set(name, biText(reason) ?? '');
  }
  const blockedPublishers = publisherReasons(blockedSection.publishers);

  const certified = new Set(strings(index.certified));
  const overrides = isObject(index.overrides) ? index.overrides : {};
  const sticky = isObject(catalog.sticky) ? catalog.sticky : {};

  const tagLabels = new Map<string, TagInfo>();
  if (isObject(index.tags)) {
    for (const [id, def] of Object.entries(index.tags)) {
      const label = isObject(def) && isObject(def.label) ? def.label : {};
      tagLabels.set(id, { zh: str(label.zh), en: str(label.en) });
    }
  }

  const entries: MarketEntry[] = [];
  const packages = isObject(catalog.packages) ? catalog.packages : {};
  for (const [name, raw] of Object.entries(packages)) {
    if (!isObject(raw)) continue;
    const kind = raw.kind;
    if (kind !== 'world' && kind !== 'provider' && kind !== 'bot') continue;
    const maintainers = strings(raw.maintainers);
    const publisherBlock = maintainers.map((m) => blockedPublishers.get(m)).find((r) => r !== undefined);
    if (publisherBlock !== undefined && !blocked.has(name)) blocked.set(name, publisherBlock);
    if (blocked.has(name)) continue;

    const override = isObject(overrides[name]) ? overrides[name] : {};
    const removed = new Set(strings(override.removeTags));
    const tags = [...new Set([...strings(raw.tags), ...strings(sticky[name]), ...strings(override.addTags)])]
      .filter((t) => !removed.has(t));
    const locales = isObject(raw.locales) ? raw.locales : {};

    entries.push({
      name,
      kind,
      version: str(raw.version) ?? '',
      displayName: str(raw.displayName),
      description: str(raw.description) ?? '',
      zh: localeText(locales.zh),
      en: localeText(locales.en),
      author: str(raw.author),
      maintainers,
      license: str(raw.license),
      keywords: strings(raw.keywords),
      tags,
      os: Array.isArray(raw.os) ? strings(raw.os) : undefined,
      official: raw.official === true,
      certified: certified.has(name),
      isNew: raw.isNew === true,
      deprecated: typeof raw.deprecated === 'string' ? raw.deprecated : raw.deprecated === true ? 'deprecated' : undefined,
      note: biText(override.note),
      supersededBy: str(override.supersededBy),
      published: str(raw.published),
      links: isObject(raw.links)
        ? Object.fromEntries(Object.entries(raw.links).filter((e): e is [string, string] => typeof e[1] === 'string'))
        : {},
      downloads: isObject(raw.downloads) ? numbers(raw.downloads, ['total', 'month', 'week']) : undefined,
      summary: isObject(raw.summary) ? numbers(raw.summary, ['tools', 'events']) : undefined,
      rating: isObject(raw.discussion) ? numbers(raw.discussion, ['up', 'down', 'comments']) : undefined,
    });
  }
  return { base, entries, blocked, tagLabels };
}

/** 拉黑的发布者:接受名字数组、`{ name, reason }` 数组或名字 → 原因的对象。 */
function publisherReasons(raw: unknown): Map<string, BiText> {
  const out = new Map<string, BiText>();
  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (typeof item === 'string') out.set(item, '');
      else if (isObject(item)) {
        const name = str(item.name) ?? str(item.login);
        if (name) out.set(name, biText(item.reason) ?? '');
      }
    }
  } else if (isObject(raw)) {
    for (const [name, reason] of Object.entries(raw)) out.set(name, biText(reason) ?? '');
  }
  return out;
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function str(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim() !== '' ? v : undefined;
}

function strings(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
}

function biText(v: unknown): BiText | undefined {
  if (typeof v === 'string') return v;
  if (isObject(v)) return { zh: str(v.zh), en: str(v.en) };
  return undefined;
}

function localeText(v: unknown): LocaleText | undefined {
  if (!isObject(v)) return undefined;
  const out = { displayName: str(v.displayName), description: str(v.description) };
  return out.displayName || out.description ? out : undefined;
}

function numbers<K extends string>(obj: Record<string, unknown>, keys: readonly K[]): Partial<Record<K, number>> {
  const out: Partial<Record<K, number>> = {};
  for (const k of keys) if (typeof obj[k] === 'number' && Number.isFinite(obj[k])) out[k] = obj[k] as number;
  return out;
}

function errorCode(error: unknown): string {
  if (error instanceof Error) {
    if (error.name === 'TimeoutError' || error.name === 'AbortError') return 'timed out';
    const cause = (error as { cause?: { code?: unknown } }).cause;
    if (cause && typeof cause.code === 'string') return cause.code;
    return error.message;
  }
  return String(error);
}

function lastSegment(url: string): string {
  return url.slice(url.lastIndexOf('/') + 1);
}
