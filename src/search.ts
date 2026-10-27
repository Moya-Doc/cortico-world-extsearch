/**
 * 本地模糊打分:关键词按语种切成词元(中日韩文字取相邻两字,其余按词),在包名、显示名、关键字、
 * 标签与简介里找子串。打分只负责把候选排到前面,挑哪个由模型读简介后决定。
 */
import type { Kind, MarketEntry, TagInfo } from './market.ts';

/** 框架的类关键字,每个包都带,不参与匹配。 */
const KIND_KEYWORDS = new Set(['cortico', 'cortico-world', 'cortico-provider', 'cortico-bot']);

const CJK = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u;
const CJK_RUN = /([\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]+)/u;
const SEPARATORS = /[\s,，、;；:：。.!！?？/\\|()（）[\]【】{}"'“”‘’《》<>+*=~`#@$%^&]+/u;

/** 字段权重:名字最重,关键字与标签其次,简介最轻。 */
const WEIGHT = { name: 3, tag: 2, text: 1 } as const;

export function normalize(text: string): string {
  return text.normalize('NFKC').toLowerCase();
}

export function tokenize(query: string): string[] {
  const out = new Set<string>();
  for (const piece of normalize(query).split(SEPARATORS)) {
    for (const run of piece.split(CJK_RUN)) {
      if (!run) continue;
      if (CJK.test(run)) {
        if (run.length === 1) out.add(run);
        for (let i = 0; i + 1 < run.length; i++) out.add(run.slice(i, i + 2));
      } else if (run.length >= 2 || /\d/.test(run)) {
        out.add(run);
      }
    }
  }
  return [...out];
}

interface Haystack {
  name: string;
  tag: string;
  text: string;
}

function haystack(entry: MarketEntry, tagLabels: ReadonlyMap<string, TagInfo>): Haystack {
  const join = (parts: Array<string | undefined>) => normalize(parts.filter(Boolean).join('\n'));
  const tagWords = entry.tags.flatMap((t) => [t, tagLabels.get(t)?.zh, tagLabels.get(t)?.en]);
  return {
    name: join([entry.name, entry.displayName, entry.zh?.displayName, entry.en?.displayName]),
    tag: join([...entry.keywords.filter((k) => !KIND_KEYWORDS.has(k)), ...tagWords]),
    text: join([entry.description, entry.zh?.description, entry.en?.description]),
  };
}

export function scoreEntry(entry: MarketEntry, tokens: readonly string[], phrase: string, tagLabels: ReadonlyMap<string, TagInfo>): number {
  if (tokens.length === 0) return 0;
  const hay = haystack(entry, tagLabels);
  let score = 0;
  let matched = 0;
  for (const token of tokens) {
    const w = hay.name.includes(token) ? WEIGHT.name : hay.tag.includes(token) ? WEIGHT.tag : hay.text.includes(token) ? WEIGHT.text : 0;
    if (w > 0) matched++;
    score += w;
  }
  if (matched === 0) return 0;
  // 整句原样出现时加分;覆盖的词元越多越靠前。
  if (phrase.length >= 2) {
    if (hay.name.includes(phrase)) score += 5;
    else if (hay.tag.includes(phrase) || hay.text.includes(phrase)) score += 2;
  }
  return score + (2 * matched) / tokens.length;
}

export interface SearchQuery {
  query?: string;
  kind?: Kind;
  /** 标签 id 或它的中英文名。 */
  tag?: string;
}

export interface SearchHit {
  entry: MarketEntry;
  score: number;
}

/** 解析标签参数:认 id,也认词表里的中英文名(不分大小写);不认识时原样返回。 */
export function resolveTag(tag: string, tagLabels: ReadonlyMap<string, TagInfo>): string {
  const wanted = normalize(tag.trim());
  for (const [id, label] of tagLabels) {
    if (normalize(id) === wanted || (label.zh && normalize(label.zh) === wanted) || (label.en && normalize(label.en) === wanted)) return id;
  }
  return wanted;
}

/** 过滤并排序。没有关键词时按累计下载量列出全部。 */
export function searchEntries(entries: readonly MarketEntry[], q: SearchQuery, tagLabels: ReadonlyMap<string, TagInfo>): SearchHit[] {
  const tag = q.tag ? resolveTag(q.tag, tagLabels) : undefined;
  const pool = entries.filter((e) => (!q.kind || e.kind === q.kind) && (!tag || e.tags.includes(tag)));
  const tokens = tokenize(q.query ?? '');
  const byPopularity = (a: MarketEntry, b: MarketEntry, key: 'total' | 'month') =>
    (b.downloads?.[key] ?? 0) - (a.downloads?.[key] ?? 0) || a.name.localeCompare(b.name);

  if (tokens.length === 0) {
    return pool.map((entry) => ({ entry, score: 0 })).sort((a, b) => byPopularity(a.entry, b.entry, 'total'));
  }
  const phrase = normalize(q.query ?? '').replace(/\s+/g, '');
  return pool
    .map((entry) => ({ entry, score: scoreEntry(entry, tokens, phrase, tagLabels) }))
    .filter((h) => h.score > 0)
    .sort((a, b) => b.score - a.score || byPopularity(a.entry, b.entry, 'month'));
}
