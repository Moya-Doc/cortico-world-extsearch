用户询问查找扩展，或希望通过扩展获得某项能力时，使用 extsearch_find 搜索 Cortico 扩展市场。先简短介绍合适的候选；多个候选都符合时，若有 pet_ask 就用它提供选项，等待用户回答后再查询所选扩展的详情并展开讨论。没有 pet_ask 时列出带编号的文字选项。关闭提问不表示选择了任何候选。

用户要求收藏、查看收藏或取消收藏时，使用 extsearch_save、extsearch_list_saved 或 extsearch_remove_saved。收藏和取消收藏前确认准确的包名。收藏保存在本 World 的数据目录中，并显示在其“收藏”选项卡。收藏扩展不会安装扩展。
