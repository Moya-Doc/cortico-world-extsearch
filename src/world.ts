/**
 * 扩展市场搜索:只有请求 / 响应工具,不产事件。读官方扩展索引,在本地模糊打分后把候选与简介交给模型挑选。
 * 收藏信息由本 World 保存在部署数据目录，模型与收藏面板共用同一份文件。
 */
import { fileURLToPath } from 'node:url';
import type { ToolDef, ToolOutcome, World, WorldWebUiDecl, WorldHost } from 'cortico/core/types.ts';
import type { Language } from 'cortico/core/language.ts';
import { extSearchConfigGroup, MAX_RESULTS_MAX, MAX_RESULTS_MIN, type ExtSearchConfigSection } from './config.ts';
import { KINDS, MarketIndex, normalizeBase, type BiText, type FetchLike, type Kind, type MarketEntry, type MarketSnapshot } from './market.ts';
import { searchEntries } from './search.ts';
import { ExtSearchFavorites } from './favorites.ts';
import { extSearchStrings } from './strings.ts';
import { UNTRUSTED_NOTE, INSTALL_NOTE, FIND_GUIDE, FAVORITES_GUIDE, EXTSEARCH_TOOL_DECLS, QUERY_MAX } from './model-text.ts';

const FIND_DESCRIPTION_MAX = 160;

export interface ExtSearchWorldOptions {
  /** `worlds.extsearch` 的活引用。 */
  cfg: ExtSearchConfigSection;
  dataDir: string;
  /** 测试注入;缺省用全局 fetch。 */
  fetch?: FetchLike;
  now?: () => number;
}

export { EXTSEARCH_TOOL_DECLS } from './model-text.ts';

export class ExtSearchWorld implements World {
  readonly id = 'extsearch';

  private readonly market: MarketIndex;
  private readonly favorites: ExtSearchFavorites;

  constructor(private readonly opts: ExtSearchWorldOptions) {
    this.market = new MarketIndex({ fetch: opts.fetch, now: opts.now });
    this.favorites = new ExtSearchFavorites(opts.dataDir, opts.now);
  }

  /** 模板没有占位符。 */
  envPromptVars(): Record<string, string> {
    return {};
  }

  tools(): ToolDef[] {
    return [
      { ...EXTSEARCH_TOOL_DECLS[0], handler: async (args) => this.find(args) },
      { ...EXTSEARCH_TOOL_DECLS[1], handler: async (args) => this.detail(args) },
      { ...EXTSEARCH_TOOL_DECLS[2], handler: async (args) => this.favoriteTool('save', args) },
      { ...EXTSEARCH_TOOL_DECLS[3], handler: async () => this.favoriteTool('list', {}) },
      { ...EXTSEARCH_TOOL_DECLS[4], handler: async (args) => this.favoriteTool('remove', args) },
    ];
  }

  webUi(language: Language = 'zh'): WorldWebUiDecl {
    const t = extSearchStrings(language);
    return {
      label: t.label,
      config: [extSearchConfigGroup(language)],
      panels: [{ id: 'favorites', title: t.favoritesTitle, getMethods: ['list'] }],
      invoke: async (panel, method, args) => {
        if (panel !== 'favorites') throw new Error(t.unknownMethod);
        if (method === 'list') return this.favoriteState();
        if (method !== 'remove' && method !== 'refresh') throw new Error(t.unknownMethod);
        const name = packageName(args[0]);
        if (!name) throw new Error(t.badName);
        if (method === 'remove') this.favorites.remove(name);
        else {
          const saved = this.favorites.list().find((item) => item.name === name);
          if (!saved) throw new Error(t.notSaved);
          let snapshot: MarketSnapshot;
          try {
            snapshot = await this.market.load(normalizeBase(saved.indexBase), true);
            if (snapshot.stale) throw new Error(snapshot.stale);
          } catch (error) {
            throw new Error(`${t.indexUnavailable} ${error instanceof Error ? error.message : String(error)}`);
          }
          const current = this.favorites.list().find((item) => item.name === name);
          if (JSON.stringify(current) !== JSON.stringify(saved)) throw new Error(t.favoriteChanged);
          const blocked = snapshot.blocked.get(name);
          const entry = snapshot.entries.find((item) => item.name === name);
          this.favorites.refresh(name, entry, blocked !== undefined ? 'blocked' : entry ? 'saved' : 'missing',
            blocked === undefined ? undefined : biText(blocked));
        }
        return this.favoriteState();
      },
      storage: [{
        key: 'extsearch.favorites', label: t.favoritesTitle, kind: 'disk',
        location: this.favorites.file, danger: true, note: t.storageDescription,
        stat: () => String(this.favorites.list().length),
        clear: () => { this.favorites.clear(); return t.storageCleared; },
      }],
      promptDocs: [
        {
          key: 'worlds.extsearch.envPrompt',
          title: t.promptTitle,
          description: t.promptDescription,
          path: fileURLToPath(new URL(language === 'zh' || language === 'zh-Hant' ? './ENV_PROMPT.zh.md' : './ENV_PROMPT.en.md', import.meta.url)),
          role: 'envPrompt',
        },
      ],
    };
  }

  async start(_host: WorldHost): Promise<void> {}

  async stop(): Promise<void> {}

  private favoriteState() {
    return { favorites: this.favorites.list() };
  }

  private async favoriteTool(action: 'save' | 'list' | 'remove', args: Record<string, unknown>): Promise<string | ToolOutcome> {
    try {
      if (action === 'list') {
        const favorites = this.favorites.list();
        return [UNTRUSTED_NOTE, FAVORITES_GUIDE, JSON.stringify({ favorites })].join('\n');
      }
      const name = packageName(args.name);
      if (!name) return { text: '[bad input] name must be an exact npm package name', failed: true };
      if (action === 'remove') {
        const removed = this.favorites.remove(name);
        return JSON.stringify({ name, removed });
      }
      const snap = await this.snapshot();
      if (!('entries' in snap)) return snap;
      if (snap.stale) return { text: `[index unavailable] ${snap.stale}. No favorite was saved.`, failed: true };
      if (snap.blocked.has(name)) return { text: `extsearch_save: ${name} is blocked by the market maintainers. No favorite was saved.`, failed: true };
      const entry = snap.entries.find((item) => item.name === name);
      if (!entry) return { text: `extsearch_save: no extension named "${name}" in the index. Use extsearch_find for its exact name.`, failed: true };
      const saved = this.favorites.save(entry, snap.base);
      return JSON.stringify({ name: saved.name, savedAt: saved.savedAt, updatedAt: saved.updatedAt, saved: true });
    } catch (error) {
      return { text: `[favorites unavailable] ${error instanceof Error ? error.message : String(error)}`, failed: true };
    }
  }

  private maxResults(): number {
    const n = Math.trunc(Number(this.opts.cfg.maxResults));
    return Number.isFinite(n) ? Math.min(MAX_RESULTS_MAX, Math.max(MAX_RESULTS_MIN, n)) : MAX_RESULTS_MAX;
  }

  /** 读索引;地址不合格或读不到时回失败回执。 */
  private async snapshot(): Promise<MarketSnapshot | ToolOutcome> {
    try {
      return await this.market.load(normalizeBase(this.opts.cfg.indexBase));
    } catch (error) {
      return { text: `[index unavailable] ${error instanceof Error ? error.message : String(error)}`, failed: true };
    }
  }

  private async find(args: Record<string, unknown>): Promise<string | ToolOutcome> {
    const query = typeof args.query === 'string' ? args.query.trim().slice(0, QUERY_MAX) : '';
    const kind = KINDS.includes(args.kind as Kind) ? (args.kind as Kind) : undefined;
    const tag = typeof args.tag === 'string' && args.tag.trim() ? args.tag.trim() : undefined;

    const snap = await this.snapshot();
    if (!('entries' in snap)) return snap;

    const hits = searchEntries(snap.entries, { query, kind, tag }, snap.tagLabels);
    const filters = [query && `"${query}"`, kind && `kind=${kind}`, tag && `tag=${tag}`].filter(Boolean).join(' · ') || 'all';
    if (hits.length === 0) {
      return `extsearch_find: ${filters} · no matches among ${snap.entries.length} extensions. Try fewer or broader keywords, the other language, or drop the filters.${staleLine(snap)}`;
    }

    const shown = hits.slice(0, this.maxResults());
    const lines = [
      `extsearch_find: ${filters} · ${hits.length} match(es), showing ${shown.length}${query ? ' by relevance' : ' by downloads'} · ${snap.entries.length} extensions in the index`,
      UNTRUSTED_NOTE,
      '',
    ];
    shown.forEach(({ entry }, i) => {
      lines.push(`${i + 1}. ${title(entry)}`);
      lines.push(`   ${facts(entry, snap).join(' · ')}`);
      lines.push(`   ${truncate(entry.zh?.description ?? entry.description, FIND_DESCRIPTION_MAX)}`);
      lines.push('');
    });
    lines.push(FIND_GUIDE);
    return lines.join('\n') + staleLine(snap);
  }

  private async detail(args: Record<string, unknown>): Promise<string | ToolOutcome> {
    const name = typeof args.name === 'string' ? args.name.trim() : '';
    if (!name) return { text: '[bad input] name must not be empty', failed: true };

    const snap = await this.snapshot();
    if (!('entries' in snap)) return snap;

    const reason = snap.blocked.get(name);
    if (reason !== undefined) {
      const why = biText(reason);
      return `extsearch_detail: ${name} is blocked by the market maintainers and hidden from the Extensions page${why ? `: ${why}` : '.'} Do not recommend it.${staleLine(snap)}`;
    }
    const entry = snap.entries.find((e) => e.name === name);
    if (!entry) {
      return `extsearch_detail: no extension named "${name}" in the index. Use extsearch_find to get the exact package name; very new packages may not be indexed yet.${staleLine(snap)}`;
    }

    const lines = [`extsearch_detail: ${title(entry)}`, UNTRUSTED_NOTE, ''];
    lines.push(`- ${facts(entry, snap).join(' · ')}`);
    if (entry.author || entry.license) lines.push(`- author: ${entry.author ?? '?'} · license: ${entry.license ?? '?'}`);
    if (entry.published) lines.push(`- latest release: ${entry.published.slice(0, 10)}`);
    if (entry.summary) lines.push(`- declares ${entry.summary.tools ?? 0} tool(s), ${entry.summary.events ?? 0} event type(s)`);
    if (entry.downloads) lines.push(`- downloads: ${entry.downloads.week ?? 0} this week, ${entry.downloads.month ?? 0} in 30 days, ${entry.downloads.total ?? 0} total`);
    if (entry.rating) lines.push(`- rating: 👍 ${entry.rating.up ?? 0} · 👎 ${entry.rating.down ?? 0} · ${entry.rating.comments ?? 0} comment(s)`);
    if (entry.deprecated) lines.push(`- deprecated: ${entry.deprecated}`);
    if (entry.supersededBy) lines.push(`- superseded by: ${entry.supersededBy}`);
    const note = entry.note && biText(entry.note);
    if (note) lines.push(`- maintainer note: ${note}`);
    lines.push('', 'Description:');
    const seen = new Set<string>();
    for (const [label, text] of [['zh', entry.zh?.description], ['en', entry.en?.description], ['npm', entry.description]] as const) {
      if (text && !seen.has(text)) {
        seen.add(text);
        lines.push(`[${label}] ${text}`);
      }
    }
    const links = Object.entries(entry.links);
    if (links.length) lines.push('', 'Links:', ...links.map(([k, v]) => `- ${k}: ${v}`));
    lines.push('', INSTALL_NOTE);
    return lines.join('\n') + staleLine(snap);
  }
}

function title(entry: MarketEntry): string {
  const display = entry.zh?.displayName ?? entry.displayName;
  return display && display !== entry.name ? `${display} — ${entry.name}` : entry.name;
}

function facts(entry: MarketEntry, snap: MarketSnapshot): string[] {
  const out: string[] = [entry.kind];
  if (entry.version) out.push(`v${entry.version}`);
  if (entry.tags.length) {
    out.push(`tags: ${entry.tags.map((t) => {
      const zh = snap.tagLabels.get(t)?.zh;
      return zh && zh !== t ? `${t}(${zh})` : t;
    }).join(', ')}`);
  }
  if (entry.os?.length) out.push(`os: ${entry.os.join(', ')}`);
  if (entry.official) out.push('official');
  if (entry.certified) out.push('certified');
  if (entry.isNew) out.push('new');
  if (entry.deprecated) out.push('deprecated');
  return out;
}

function biText(text: BiText): string {
  return typeof text === 'string' ? text : (text.zh ?? text.en ?? '');
}

function truncate(text: string, max: number): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
}

function staleLine(snap: MarketSnapshot): string {
  return snap.stale ? `\n(Refreshing the index failed, so this uses the copy read earlier: ${snap.stale})` : '';
}

function packageName(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const name = value.trim();
  return name.length <= QUERY_MAX && /^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/.test(name) ? name : undefined;
}
