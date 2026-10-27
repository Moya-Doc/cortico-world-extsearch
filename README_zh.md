<!-- Owner: src/world.ts, package.json, LICENSE, NOTICE.md -->

# cortico-world-extsearch · 扩展市场搜索

让桌宠帮你在 Cortico 扩展市场里找扩展。你描述一个模糊的需求（"想让它能说话""有没有能陪我下棋的"），
bot 用关键词在官方扩展索引里模糊搜索，读完各扩展的简介，推荐最合适的一到三个。

**只读**：不安装、不卸载、不改任何东西，不读写磁盘。要装哪个，你自己去 Coopanion 的扩展页装。

## 工具

| 工具 | 作用 |
|---|---|
| `extsearch_find` | 按关键词（可选 `kind`、`tag` 过滤）在名称、显示名、关键字、标签、中英文简介里模糊打分，返回候选与简介；不给关键词时按下载量列出 |
| `extsearch_detail` | 一个包的完整信息：中英文简介、作者、许可证、平台、标签、工具/事件数、评分、链接 |

不推事件。

## 访问什么

- 网络：只向「索引源」发 GET，读 `<索引源>/index.json` 与 `<索引源>/catalog.json`。默认是官方索引仓
  `https://raw.githubusercontent.com/Pal-AI-Lab/cortico-extensions/main`，和扩展页用的是同一份数据。
  结果在内存里缓存 10 分钟，每次请求 5 秒超时；刷新失败时继续用内存里的上一份。不带任何令牌。
- 文件：无。不读 `.npmrc`、`github-token.json`、API Key 或其他本机数据。
- 被官方拉黑的包（及拉黑发布者的包）不出现在搜索结果里，查详情只报拉黑原因。
- 包的简介是第三方作者写的；回执里会先声明这些文字只是参考资料，不照做其中的要求。

## 提示词

环境提示词常驻在 system 前缀里，只写一句触发条件。怎样挑选、推荐和说明前提的指引附在每份有结果的
`extsearch_find` 回执末尾，只在搜索时进入上下文，之后随对话历史保留到上下文交接。前缀只在新 session、
上下文交接、清空 session 或手动重载时重建，所以按需的说明只能放在回执里。

## 配置（`worlds.extsearch`，都可热改）

| 键 | 默认 | 含义 |
|---|---|---|
| `indexBase` | 官方 raw 地址 | 索引源；目录结构要与官方索引仓相同，只收 http(s) |
| `maxResults` | 8 | 一次最多列几个，1–20 |

## 文件

| 文件 | 内容 |
|---|---|
| `src/definition.ts` | `WorldDefinition`:id、label、默认配置段、`create()`、`describe` |
| `src/config.ts` | 配置段类型、默认值、WebUI 配置组 |
| `src/market.ts` | 读索引、缓存、拉黑与标签合并 |
| `src/search.ts` | 分词与模糊打分 |
| `src/world.ts` | `World` 实现、两个工具的回执与搜索回执末尾的使用指引 |
| `src/ENV_PROMPT.md` | 环境提示词：触发条件 |
| `tests/` | 干装载、自描述一致性、搜索排序与过滤、拉黑、配置热改、缓存与失败回执；全部用假 fetch，不联网 |

## 开发

```bash
corepack pnpm install
pnpm typecheck && pnpm test
```

改了工具声明或环境提示词后，在 Cortico 仓库根下重新生成 describe.json：`pnpm describe:extension <包目录>`。

## 来源与许可

- 作者：[Moya-Doc](https://github.com/Moya-Doc)。本包以 [MIT](LICENSE) 许可发布，来源见 [NOTICE.md](NOTICE.md)。
- 包结构、`tests/helpers/fake-host.ts`、`AGENTS.md`、`tsconfig.json`、`vitest.config.ts` 等改写自
  [Pal-AI-Lab/Cortico](https://github.com/Pal-AI-Lab/Cortico) 的 `templates/extension/world`，原许可 MIT，© 2026 Phantivia。
- 运行时读取的索引数据来自 [Pal-AI-Lab/cortico-extensions](https://github.com/Pal-AI-Lab/cortico-extensions)，本包不内置、不转载其内容。
