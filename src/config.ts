import type { ConfigGroup } from 'cortico/core/types.ts';
import type { Language } from 'cortico/core/language.ts';
import { extSearchStrings } from './strings.ts';

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

/** World 配置的 JSON Schema 声明;文案按界面语言给。 */
export function extSearchConfigGroup(language: Language): ConfigGroup {
  const t = extSearchStrings(language);
  return {
    id: 'world:extsearch',
    owner: 'world:extsearch',
    schema: {
      type: 'object',
      title: t.label,
      description: t.configDescription,
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
