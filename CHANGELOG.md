## 0.2.0

- 多个扩展候选适合时，指引 bot 先介绍差异，再通过 `pet_ask` 提供选项；收到用户选择后查询详情并讨论。没有 `pet_ask` 时使用文字选项。
- 新增收藏、查看收藏和取消收藏工具，以及“收藏”选项卡。收藏保存在部署数据目录，重启后保留。
- 收藏保留包信息快照和索引来源；刷新可更新快照，索引中已消失或被屏蔽的包保留原信息并显示状态。

- When several extensions fit, the bot is instructed to introduce their differences and offer a `pet_ask` choice, then fetch details after the user answers. Text options are used when `pet_ask` is unavailable.
- Added tools to save, list and remove favorites, plus a Favorites tab. Favorites persist in deployment data across restarts.
- Favorites retain package snapshots and index sources. Refresh updates the snapshot or marks a missing or blocked package while preserving its earlier information.

## 0.1.0

- 首个版本：`extsearch_find` 按关键词模糊搜索官方扩展索引，`extsearch_detail` 查看单个扩展的完整信息。
- 配置项 `indexBase`（索引源）与 `maxResults`（最多返回几个）。
