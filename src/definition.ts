import { describeTools, type WorldDefinition } from 'cortico/world.ts';
import { EXTSEARCH_DEFAULTS, type ExtSearchConfigSection } from './config.ts';
import { EXTSEARCH_TOOL_DECLS, ExtSearchWorld } from './world.ts';

export const EXTSEARCH: WorldDefinition<ExtSearchConfigSection> = {
  id: 'extsearch',
  label: '扩展市场搜索',
  defaults: () => ({ ...EXTSEARCH_DEFAULTS }),
  // `ctx.cfg` 是 `worlds.extsearch` 的活引用:热改的键现读即生效。构造时不发请求。
  create: (ctx) => new ExtSearchWorld({ cfg: ctx.cfg }),
  // 自描述:可能出现的全部工具;这个 World 不推事件。
  describe: {
    tools: describeTools(EXTSEARCH_TOOL_DECLS, {
      extsearch_find: { zh: '按关键词在扩展市场里模糊搜索扩展，返回候选和简介。', en: 'Fuzzy-searches the extension market by keywords and returns candidates with descriptions.' },
      extsearch_detail: { zh: '查看某个扩展在市场里的完整信息。', en: 'Shows the full market entry of one extension.' },
    }),
    events: [],
  },
};
