import type { ConfigGroup } from 'cortico/core/types.ts';
import { pick, type Language } from 'cortico/core/language.ts';

/** 官方索引仓 main 分支的 raw 地址;与扩展页「索引源」的默认值相同。 */
export const DEFAULT_INDEX_BASE = 'https://raw.githubusercontent.com/Pal-AI-Lab/cortico-extensions/main';

export const MAX_RESULTS_MIN = 1;
export const MAX_RESULTS_MAX = 20;

/** config.json 的 worlds.extsearch 段，默认禁用；bot 或部署可启用。两项都在调用时现读，热改。 */
export interface ExtSearchConfigSection {
  enabled: boolean;
  /** 索引源:目录结构与官方索引仓相同(`<地址>/index.json`、`<地址>/catalog.json`)。 */
  indexBase: string;
  /** `extsearch_find` 一次最多列几个包。 */
  maxResults: number;
}

export const EXTSEARCH_DEFAULTS: ExtSearchConfigSection = {
  enabled: false,
  indexBase: DEFAULT_INDEX_BASE,
  maxResults: 8,
};

const TEXT = {
  zh: {
    title: '扩展市场搜索',
    description: '只读官方扩展索引，不安装任何东西。',
    indexBaseTitle: '索引源',
    indexBaseDescription: '扩展索引的地址，目录结构要与官方索引仓相同。访问 GitHub 慢时可换成镜像；留默认即用官方地址。',
    maxResultsTitle: '最多返回',
    maxResultsDescription: '每次搜索最多列出几个扩展。',
  },
  en: {
    title: 'Extension Market Search',
    description: 'Reads the official extension index only; never installs anything.',
    indexBaseTitle: 'Index source',
    indexBaseDescription: 'Address of the extension index, laid out like the official index repository. Use a mirror if GitHub is slow; the default is the official address.',
    maxResultsTitle: 'Max results',
    maxResultsDescription: 'How many extensions one search lists at most.',
  },
};

/** World 配置的 JSON Schema 声明;文案按界面语言给。 */
export function extSearchConfigGroup(language: Language): ConfigGroup {
  const t = pick(language, TEXT);
  return {
    id: 'world:extsearch',
    owner: 'world:extsearch',
    schema: {
      type: 'object',
      title: t.title,
      description: t.description,
      properties: {
        'worlds.extsearch.indexBase': {
          type: 'string',
          title: t.indexBaseTitle,
          description: t.indexBaseDescription,
          'x-hot': true,
        },
        'worlds.extsearch.maxResults': {
          type: 'integer',
          title: t.maxResultsTitle,
          description: t.maxResultsDescription,
          minimum: MAX_RESULTS_MIN,
          maximum: MAX_RESULTS_MAX,
          'x-hot': true,
        },
      },
    },
  };
}
