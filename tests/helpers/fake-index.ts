/** 测试用的小索引与假 fetch:内容是编出来的,字段形状照官方索引仓的 index.json / catalog.json。 */
import type { FetchLike } from '../../src/market.ts';

export const INDEX = {
  schema: 1,
  tags: {
    voice: { label: { zh: '语音', en: 'Voice' } },
    game: { label: { zh: '游戏', en: 'Games' } },
    internet: { label: { zh: '联网', en: 'Internet' } },
    unsafe: { label: { zh: '不安全', en: 'Unsafe' } },
  },
  certified: ['cortico-world-speak'],
  blocked: {
    packages: { 'cortico-world-evil': { zh: '会改写程序文件', en: 'Rewrites program files' } },
    publishers: ['badguy'],
  },
  overrides: {
    'cortico-world-chess': { addTags: ['game'], note: { zh: '需要先装棋盘软件', en: 'Needs a board app' } },
  },
};

export const CATALOG = {
  schema: 1,
  sticky: { 'cortico-world-shell': ['unsafe'] },
  packages: {
    'cortico-world-speak': {
      kind: 'world', version: '1.2.0', displayName: 'Speak', description: 'Reads replies aloud with local TTS',
      locales: { zh: { displayName: '朗读', description: '用本机语音合成把回复读出来' } },
      maintainers: ['alice'], license: 'MIT', keywords: ['cortico-world', 'cortico', 'tts'], tags: ['voice'],
      links: { npm: 'https://www.npmjs.com/package/cortico-world-speak' }, official: false, isNew: false,
      downloads: { total: 500, month: 100, week: 20 }, summary: { tools: 1, events: 0 },
      discussion: { up: 3, down: 0, comments: 1 }, os: ['win32'], published: '2026-10-01T00:00:00.000Z',
    },
    'cortico-world-chess': {
      kind: 'world', version: '0.3.0', description: 'Play chess with the bot',
      maintainers: ['bob'], keywords: ['cortico-world', 'chess'], tags: [], links: {}, official: false, isNew: true,
      downloads: { total: 50, month: 30, week: 5 },
    },
    'cortico-world-shell': {
      kind: 'world', version: '0.1.0', description: 'Run shell commands',
      maintainers: ['carol'], keywords: ['cortico-world'], tags: [], links: {}, official: false, isNew: false,
      downloads: { total: 900, month: 10, week: 1 },
    },
    'cortico-provider-fast': {
      kind: 'provider', version: '2.0.0', description: 'A fast voice-capable model service',
      maintainers: ['dave'], keywords: ['cortico-provider'], tags: [], links: {}, official: true, isNew: false,
      downloads: { total: 10, month: 1, week: 0 },
    },
    'cortico-world-evil': {
      kind: 'world', version: '1.0.0', description: 'Patches the app with voice', maintainers: ['eve'],
      keywords: ['cortico-world'], tags: ['voice'], links: {}, official: false, isNew: false,
    },
    'cortico-world-badvoice': {
      kind: 'world', version: '1.0.0', description: 'Another voice pack', maintainers: ['badguy'],
      keywords: ['cortico-world'], tags: ['voice'], links: {}, official: false, isNew: false,
    },
  },
};

export interface FakeFetch extends FetchLike {
  calls: string[];
  /** 置真后每次请求都抛网络错误。 */
  offline: boolean;
}

export function fakeFetch(files: Record<string, unknown> = { 'index.json': INDEX, 'catalog.json': CATALOG }): FakeFetch {
  const fn: FakeFetch = Object.assign(
    async (url: string) => {
      fn.calls.push(url);
      if (fn.offline) throw Object.assign(new TypeError('fetch failed'), { cause: { code: 'ENOTFOUND' } });
      const file = url.slice(url.lastIndexOf('/') + 1);
      if (!(file in files)) return { ok: false, status: 404, json: async (): Promise<unknown> => ({}) };
      return { ok: true, status: 200, json: async (): Promise<unknown> => structuredClone(files[file]) };
    },
    { calls: [] as string[], offline: false },
  );
  return fn;
}
