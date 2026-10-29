<!-- Owner: src/world.ts, src/favorites.ts, src/config.ts, src/market.ts, src/search.ts, src/model-text.ts, src/ENV_PROMPT.zh.md, webui/client.ts, webui/style.css, package.json, LICENSE, NOTICE.md -->

# cortico-world-extsearch · 扩展市场搜索

搜索 Cortico 扩展市场，选择候选后进一步讨论，并收藏扩展。World API：**6**。需要 Node.js **22 或更高版本**。

[English](README.md)

作者：[Moya-Doc](https://github.com/Moya-Doc)。许可证：[MIT](LICENSE)。来源说明：[NOTICE.md](NOTICE.md)。

## 安装

在 Coopanion 的扩展页从 npm 安装 `cortico-world-extsearch`，或选择包含本包 `package.json` 的本地目录。按安装回执要求重启，然后启用 extsearch World。

从源码本地安装前，先安装依赖并构建自定义面板：

```sh
corepack pnpm install --frozen-lockfile
pnpm build
```

本地源码更新后，重新构建面板并重启 Coopanion 以加载代码。应用或重新加载系统前缀，使当前对话使用更新后的环境提示词。如果部署使用自定义提示词覆盖，也需要同步修改覆盖内容。

## 搜索与选择

可以让 Coo 查找提供某项能力的扩展，例如语音输出或游戏。搜索会在名称、标签和中英文简介中匹配关键词。

多个候选都合适时，搜索指引要求 Coo 先简短介绍它们的区别和使用前提，再提供选择。desktop-pet World 的 `pet_ask` 工具可用时，使用已有提问界面，一次最多三个选项，并允许用户自行输入。Coo 先介绍再提问，因为新的 `pet_say` 或 `pet_ask` 会替换尚未回答的问题。

收到用户回答后，Coo 按指引查询所选包的详情并展开讨论。关闭问题不代表选择任何包。没有 `pet_ask` 时使用带编号的文字选项。只有一个合适候选时无需选择；候选较多时可先根据用户偏好缩小范围。此流程依赖 Coo 遵循工具和环境提示词。

## 收藏

可以要求 Coo 收藏指定扩展、查看收藏列表或取消收藏。包名有歧义时，应先确认要操作的扩展。收藏不会安装扩展；安装仍在 Coopanion 的扩展页单独进行。

World 的“收藏”选项卡显示已保存的包名、简介、版本、标签、平台信息、时间和项目链接，支持筛选、取消收藏和刷新包信息。Coo 修改收藏后，页面会更新。

收藏保存在 `<dataDir>/extsearch/favorites.json`，`dataDir` 是 Cortico 提供的部署数据目录。每条记录包含准确包名、包信息快照、索引来源和收藏及更新时间。重复收藏同一个包会更新快照，保留首次收藏时间，不会产生重复记录。重启后收藏仍然保留。

查看和取消收藏无需联网。刷新使用收藏记录的索引来源；包已从索引消失或被屏蔽时，保留原快照并标出对应状态。索引请求失败时保留原收藏记录。快照表示上次收藏或刷新时的信息，不保证包当前仍然可用。收藏由本 World 独立保存，不写入 Memory。

## 工具

| 工具 | 作用 |
| --- | --- |
| `extsearch_find` | 按关键词搜索，可用 `kind` 和 `tag` 筛选；没有关键词时按累计下载量排序。 |
| `extsearch_detail` | 查询包的中英文简介、作者、许可证、平台、标签、版本、工具及事件数、评分和链接。 |
| `extsearch_save` | 按准确包名收藏索引中的扩展。 |
| `extsearch_list_saved` | 从部署数据中读取收藏列表。 |
| `extsearch_remove_saved` | 按准确包名取消收藏。 |

本 World 不推送事件。提问的回答由 desktop-pet World 通过已有的 `desktop-pet.answer` 事件传递。

## 配置

以下配置位于 `worlds.extsearch`：

| 键 | 默认值 | 作用 |
| --- | --- | --- |
| `enabled` | `false` | 启用 World。 |
| `indexBase` | `https://raw.githubusercontent.com/Pal-AI-Lab/cortico-extensions/main` | 搜索和新收藏使用的 HTTP(S) 索引地址，下次调用工具时生效。 |
| `maxResults` | `8` | 每次搜索最多返回的数量，范围 1–20，下次调用工具时生效。 |

## 数据访问

工具从配置的索引源获取 `index.json` 和 `catalog.json`，请求不附带凭据，关键词在本地匹配。索引在内存中缓存十分钟，请求超时为五秒。搜索时刷新失败，可使用同一索引源的上一份内存快照，并在回执中说明。

被屏蔽的包及被屏蔽发布者的包不会出现在搜索结果中。包简介和备注是第三方文本，工具回执要求模型将其作为参考资料。

本包读写自己的收藏文件，不读取本机凭据、执行命令或安装扩展。宿主负责加载包内环境提示词及自定义面板资源。

## 开发

```sh
pnpm test
pnpm typecheck
pnpm build
```

修改工具声明或环境提示词后，在 Cortico 检出目录运行 `pnpm describe:extension <包目录>`。发布前运行 `pnpm check:extension <包目录>`。测试使用临时数据目录和本地索引样例，不发送网络请求。
