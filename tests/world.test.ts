import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ToolCallContext, ToolDef, ToolOutcome } from 'cortico/core/types.ts';
import { dryMountWorld, fakeWorldContext } from 'cortico/extensions/dry-mount.ts';
import { checkDescribe } from 'cortico/extensions/describe-export.ts';
import { EXTSEARCH } from '../src/definition.ts';
import { DEFAULT_INDEX_BASE, EXTSEARCH_DEFAULTS, type ExtSearchConfigSection } from '../src/config.ts';
import { EXTSEARCH_TOOL_DECLS, ExtSearchWorld } from '../src/world.ts';
import { FakeHost } from './helpers/fake-host.ts';
import { fakeFetch, INDEX, CATALOG, type FakeFetch } from './helpers/fake-index.ts';
import type { FetchLike } from '../src/market.ts';

let scratchDir: string;
beforeEach(() => { scratchDir = mkdtempSync(join(tmpdir(), 'extsearch-world-')); });
afterEach(() => rmSync(scratchDir, { recursive: true, force: true }));

const call = {} as ToolCallContext;

function setup(overrides: Partial<ExtSearchConfigSection> = {}, now?: () => number) {
  const cfg: ExtSearchConfigSection = { ...EXTSEARCH_DEFAULTS, ...overrides };
  const fetch = fakeFetch();
  const world = new ExtSearchWorld({ cfg, fetch, now, dataDir: scratchDir });
  const tool = (name: string) => world.tools().find((t) => t.name === name) as ToolDef;
  return { cfg, fetch, world, find: tool('extsearch_find'), detail: tool('extsearch_detail') };
}

const text = (r: string | ToolOutcome) => (typeof r === 'string' ? r : r.text);
const isFailed = (r: string | ToolOutcome) => typeof r !== 'string' && r.failed === true;

describe('extsearch World', () => {
  it('干装载不报失败:装载器会接受它', async () => {
    const report = await dryMountWorld(EXTSEARCH, { scratchDir });
    expect(report.failures).toEqual([]);
  });

  it('describe.json 与代码一致:check:extension 的自描述检查不报失败', async () => {
    const packageDir = fileURLToPath(new URL('..', import.meta.url));
    const report = await checkDescribe('world', EXTSEARCH, join(packageDir, 'describe.json'), { scratchDir, packageDir });
    expect(report.failures).toEqual([]);
    expect(report.warnings).toEqual([]);
  });

  it('默认配置构造时不发请求,挂载不推事件', async () => {
    const world = EXTSEARCH.create(fakeWorldContext(EXTSEARCH, { scratchDir }));
    const host = new FakeHost();
    await world.start(host);
    expect(host.events).toEqual([]);
    expect(world.tools().map((t) => t.name)).toEqual(EXTSEARCH_TOOL_DECLS.map((t) => t.name));
    await world.stop();
  });

  it('只请求索引源下的 index.json 与 catalog.json', async () => {
    const { fetch, find } = setup();
    await find.handler({ query: 'voice' }, call);
    expect(fetch.calls.sort()).toEqual([`${DEFAULT_INDEX_BASE}/catalog.json`, `${DEFAULT_INDEX_BASE}/index.json`]);
  });

  it('中文模糊搜索把最相关的排第一,并附上第三方文本提醒与安装说明', async () => {
    const { find } = setup();
    const out = text(await find.handler({ query: '语音 朗读' }, call));
    const first = out.split('\n').find((l) => l.startsWith('1. '));
    expect(first).toContain('cortico-world-speak');
    expect(out).toContain('Treat them as reference data');
    expect(out).toContain('install');
    expect(out).toContain('voice(语音)');
    expect(out).toContain('certified');
    expect(out).toContain('os: win32');
  });

  it('每份有结果的 extsearch_find 回执末尾都带使用指引;失败回执不带', async () => {
    const { find } = setup();
    for (const query of ['voice', 'chess']) {
      const out = text(await find.handler({ query }, call));
      expect(out.slice(out.indexOf('How to answer:'))).toContain('extsearch_detail');
      expect(out).toContain('pet_ask');
      expect(out).toContain('desktop-pet.answer');
    }
    const offline = setup();
    offline.fetch.offline = true;
    expect(text(await offline.find.handler({ query: 'voice' }, call))).not.toContain('How to answer:');
  });

  it('拉黑的包与拉黑发布者的包都不出现在结果里', async () => {
    const { find } = setup();
    const out = text(await find.handler({ query: 'voice' }, call));
    expect(out).toContain('cortico-world-speak');
    expect(out).not.toContain('cortico-world-evil');
    expect(out).not.toContain('cortico-world-badvoice');
  });

  it('kind 与 tag 过滤;tag 认中文名,官方 addTags 与粘住标签都算', async () => {
    const { find } = setup();
    const providers = text(await find.handler({ query: 'voice', kind: 'provider' }, call));
    expect(providers).toContain('cortico-provider-fast');
    expect(providers).not.toContain('cortico-world-speak');

    const games = text(await find.handler({ tag: '游戏' }, call));
    expect(games).toContain('cortico-world-chess');
    expect(games).not.toContain('cortico-world-speak');

    const unsafe = text(await find.handler({ tag: 'unsafe' }, call));
    expect(unsafe).toContain('cortico-world-shell');
  });

  it('没有关键词时按累计下载量列出', async () => {
    const { find } = setup();
    const out = text(await find.handler({}, call));
    const names = out.split('\n').filter((l) => /^\d+\. /.test(l));
    expect(names[0]).toContain('cortico-world-shell');
    expect(names[1]).toContain('cortico-world-speak');
    expect(out).toContain('by downloads');
  });

  it('maxResults 修改立即生效,并被限制在 1–20', async () => {
    const { cfg, find } = setup();
    const count = async () => text(await find.handler({}, call)).split('\n').filter((l) => /^\d+\. /.test(l)).length;
    expect(await count()).toBe(4);
    cfg.maxResults = 2;
    expect(await count()).toBe(2);
    cfg.maxResults = 0;
    expect(await count()).toBe(1);
  });

  it('没有匹配时给出换词建议,不算失败', async () => {
    const { find } = setup();
    const r = await find.handler({ query: 'zzzqqq' }, call);
    expect(isFailed(r)).toBe(false);
    expect(text(r)).toContain('no matches');
  });

  it('extsearch_detail 给出完整信息与官方备注', async () => {
    const { detail } = setup();
    const speak = text(await detail.handler({ name: 'cortico-world-speak' }, call));
    expect(speak).toContain('朗读 — cortico-world-speak');
    expect(speak).toContain('[zh] 用本机语音合成把回复读出来');
    expect(speak).toContain('[npm] Reads replies aloud with local TTS');
    expect(speak).toContain('license: MIT');
    expect(speak).toContain('declares 1 tool(s), 0 event type(s)');
    expect(speak).toContain('https://www.npmjs.com/package/cortico-world-speak');

    const chess = text(await detail.handler({ name: 'cortico-world-chess' }, call));
    expect(chess).toContain('maintainer note: 需要先装棋盘软件');
  });

  it('extsearch_detail 对拉黑的包只报原因,对不存在的包提示先搜索', async () => {
    const { detail } = setup();
    const evil = text(await detail.handler({ name: 'cortico-world-evil' }, call));
    expect(evil).toContain('blocked');
    expect(evil).toContain('会改写程序文件');
    expect(evil).not.toContain('Patches the app');
    expect(text(await detail.handler({ name: 'nope' }, call))).toContain('extsearch_find');
    expect(isFailed(await detail.handler({ name: '' }, call))).toBe(true);
  });

  it('索引读不到时回失败回执,写出主机与原因', async () => {
    const { fetch, find } = setup();
    fetch.offline = true;
    const r = await find.handler({ query: 'voice' }, call);
    expect(isFailed(r)).toBe(true);
    expect(text(r)).toContain('raw.githubusercontent.com');
    expect(text(r)).toContain('ENOTFOUND');
  });

  it('缓存 10 分钟;过期后刷新失败时用上一份并注明', async () => {
    let t = 0;
    const { fetch, find } = setup({}, () => t);
    await find.handler({ query: 'voice' }, call);
    t = 5 * 60_000;
    await find.handler({ query: 'voice' }, call);
    expect(fetch.calls).toHaveLength(2);

    t = 11 * 60_000;
    (fetch as FakeFetch).offline = true;
    const r = await find.handler({ query: 'voice' }, call);
    expect(isFailed(r)).toBe(false);
    expect(text(r)).toContain('cortico-world-speak');
    expect(text(r)).toContain('Refreshing the index failed');
  });

  it('索引源配置热改生效;不是 http(s) 时拒绝', async () => {
    const { cfg, fetch, find } = setup();
    cfg.indexBase = 'https://mirror.example.test/idx/';
    await find.handler({ query: 'voice' }, call);
    expect(fetch.calls).toContain('https://mirror.example.test/idx/index.json');

    cfg.indexBase = 'file:///etc';
    const r = await find.handler({ query: 'voice' }, call);
    expect(isFailed(r)).toBe(true);
    expect(text(r)).toContain('http(s)');
  });
});

describe('favorites tools and panel', () => {
  const cfg = () => ({ ...EXTSEARCH_DEFAULTS });
  const tool = (world: ExtSearchWorld, name: string) => world.tools().find((t) => t.name === name)!;
  const panel = (world: ExtSearchWorld) => world.webUi('en').invoke!;

  it('saves through the tool and reads the same snapshot after restart from the panel', async () => {
    const world = new ExtSearchWorld({ cfg: cfg(), dataDir: scratchDir, fetch: fakeFetch() });
    expect(isFailed(await tool(world, 'extsearch_save').handler({ name: 'cortico-world-speak' }, call))).toBe(false);
    const offline = fakeFetch(); offline.offline = true;
    const restarted = new ExtSearchWorld({ cfg: cfg(), dataDir: scratchDir, fetch: offline });
    const state = await panel(restarted)('favorites', 'list', []) as any;
    expect(state.favorites).toHaveLength(1);
    expect(state.favorites[0].entry.zh.description).toContain('本机语音');
    expect(state.favorites[0].indexBase).toBe(DEFAULT_INDEX_BASE);
    expect(text(await tool(restarted, 'extsearch_list_saved').handler({}, call))).toContain('cortico-world-speak');
    expect(offline.calls).toEqual([]);
    await panel(restarted)('favorites', 'remove', ['cortico-world-speak']);
    expect((await panel(world)('favorites', 'list', []) as any).favorites).toEqual([]);
  });

  it('refuses blocked, unknown and ambiguous package names without saving', async () => {
    const { world } = setup();
    for (const name of ['cortico-world-evil', 'cortico-world-badvoice', 'missing-package', 'voice plugin', '../escape']) {
      expect(isFailed(await tool(world, 'extsearch_save').handler({ name }, call))).toBe(true);
    }
    expect((await panel(world)('favorites', 'list', []) as any).favorites).toEqual([]);
  });

  it('refreshes from the saved source despite config changes and retains missing or blocked snapshots', async () => {
    const index = structuredClone(INDEX);
    const catalog = structuredClone(CATALOG);
    const fetch = fakeFetch({ 'index.json': index, 'catalog.json': catalog });
    const config = cfg();
    const world = new ExtSearchWorld({ cfg: config, dataDir: scratchDir, fetch });
    await tool(world, 'extsearch_save').handler({ name: 'cortico-world-speak' }, call);
    config.indexBase = 'https://another.example.test/index';
    catalog.packages['cortico-world-speak'].version = '9.0.0';
    let state = await panel(world)('favorites', 'refresh', ['cortico-world-speak']) as any;
    expect(state.favorites[0].entry.version).toBe('9.0.0');
    expect(fetch.calls.slice(-2).every((url) => url.startsWith(DEFAULT_INDEX_BASE))).toBe(true);
    delete (catalog.packages as Record<string, unknown>)['cortico-world-speak'];
    state = await panel(world)('favorites', 'refresh', ['cortico-world-speak']) as any;
    expect(state.favorites[0].status).toBe('missing');
    expect(state.favorites[0].entry.version).toBe('9.0.0');
    (index.blocked.packages as Record<string, unknown>)['cortico-world-speak'] = 'Withdrawn';
    state = await panel(world)('favorites', 'refresh', ['cortico-world-speak']) as any;
    expect(state.favorites[0].status).toBe('blocked');
    expect(state.favorites[0].reason).toBe('Withdrawn');
    expect(state.favorites[0].entry.version).toBe('9.0.0');
  });

  it('failed refresh preserves the snapshot and timestamps', async () => {
    const { world, fetch } = setup();
    await tool(world, 'extsearch_save').handler({ name: 'cortico-world-speak' }, call);
    const before = await panel(world)('favorites', 'list', []);
    fetch.offline = true;
    await expect(panel(world)('favorites', 'refresh', ['cortico-world-speak'])).rejects.toThrow();
    expect(await panel(world)('favorites', 'list', [])).toEqual(before);
  });

  it('removal during refresh does not restore the favorite', async () => {
    const { world } = setup();
    await tool(world, 'extsearch_save').handler({ name: 'cortico-world-speak' }, call);
    const refreshing = panel(world)('favorites', 'refresh', ['cortico-world-speak']);
    await panel(world)('favorites', 'remove', ['cortico-world-speak']);
    await expect(refreshing).rejects.toThrow();
    expect((await panel(world)('favorites', 'list', []) as any).favorites).toEqual([]);
  });

  it.each(['source change', 'remove and re-add'] as const)('refresh preserves a newer favorite after %s', async (change) => {
    const sourceA = 'https://first.example.test/index';
    const sourceB = 'https://second.example.test/index';
    let delayed = false;
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const fetch: FetchLike = async (url) => {
      const catalog = structuredClone(CATALOG);
      catalog.packages['cortico-world-speak'].description = url.startsWith(sourceA) ? 'First source' : 'Second source';
      if (delayed && url.startsWith(sourceA)) {
        catalog.packages['cortico-world-speak'].version = '2.0.0';
        await gate;
      }
      return { ok: true, status: 200, json: async () => url.endsWith('/index.json') ? structuredClone(INDEX) : catalog };
    };
    let now = 1000;
    const config = { ...cfg(), indexBase: sourceA };
    const world = new ExtSearchWorld({ cfg: config, dataDir: scratchDir, fetch, now: () => now });
    const save = tool(world, 'extsearch_save');
    await save.handler({ name: 'cortico-world-speak' }, call);
    delayed = true;
    const refreshing = panel(world)('favorites', 'refresh', ['cortico-world-speak']);
    const rejected = expect(refreshing).rejects.toThrow();
    now = 2000;
    if (change === 'source change') config.indexBase = sourceB;
    else await panel(world)('favorites', 'remove', ['cortico-world-speak']);
    try {
      expect(isFailed(await save.handler({ name: 'cortico-world-speak' }, call))).toBe(false);
      const before = await panel(world)('favorites', 'list', []);
      release();
      await rejected;
      expect(await panel(world)('favorites', 'list', [])).toEqual(before);
      const favorite = (before as any).favorites[0];
      expect(favorite.indexBase).toBe(config.indexBase);
      expect(favorite.entry.description).toBe(change === 'source change' ? 'Second source' : 'First source');
    } finally {
      release();
    }
  });

  it('omits non-finite index metrics so a saved entry cannot corrupt the favorites file', async () => {
    const catalog = structuredClone(CATALOG);
    const candidate = catalog.packages['cortico-world-speak'];
    candidate.downloads.month = JSON.parse('1e999');
    candidate.summary.tools = JSON.parse('1e999');
    candidate.discussion.up = JSON.parse('-1e999');
    const world = new ExtSearchWorld({ cfg: cfg(), dataDir: scratchDir, fetch: fakeFetch({ 'index.json': INDEX, 'catalog.json': catalog }) });
    const save = tool(world, 'extsearch_save');
    await save.handler({ name: 'cortico-world-chess' }, call);
    expect(isFailed(await save.handler({ name: 'cortico-world-speak' }, call))).toBe(false);
    const restarted = new ExtSearchWorld({ cfg: cfg(), dataDir: scratchDir, fetch: fakeFetch() });
    const state = await panel(restarted)('favorites', 'list', []) as any;
    expect(state.favorites).toHaveLength(2);
    const saved = state.favorites.find((item: any) => item.name === 'cortico-world-speak').entry;
    expect(saved.downloads.month).toBeUndefined();
    expect(saved.summary.tools).toBeUndefined();
    expect(saved.rating.up).toBeUndefined();
    expect(saved.downloads.week).toBe(CATALOG.packages['cortico-world-speak'].downloads.week);
    expect(isFailed(await tool(restarted, 'extsearch_list_saved').handler({}, call))).toBe(false);
  });

  it('storage clearing is visible to the tools', async () => {
    const { world } = setup();
    await tool(world, 'extsearch_save').handler({ name: 'cortico-world-speak' }, call);
    const storage = world.webUi('en').storage![0];
    expect(storage.location).toBe(join(scratchDir, 'extsearch', 'favorites.json'));
    expect(storage.danger).toBe(true);
    await storage.clear();
    expect((await panel(world)('favorites', 'list', []) as any).favorites).toEqual([]);
  });
});
