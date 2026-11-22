# Achievement Unlocked

输入一个目标，生成章节和任务，收集普通与隐藏徽章。完成任务后可以进入讽刺性的领奖流程。在 Settings 中关闭 Evil UX 即可使用普通奖励反馈。

- 正式入口 https://www.frankwong.dev/achievement
- 独立入口 https://achievement-unlocked-franky15.vercel.app

## 开发

使用 Node 22，运行 `npm install`、`npm test`、`npm run dev`。生产构建 `npm run build` 会先运行测试。

## AI 与存档

三个 Next.js Route Handler 调用 AIHubMix 的 `deepseek-v4-flash`。目标和章节按需生成，每次完成或撤销任务后重新判定隐藏徽章。界面单独标记示例 Quest。模型、网络或配额错误由用户选择 Retry。

生产环境使用 `AIHUBMIX_API_KEY`、`AIHUBMIX_BASE_URL`、`AIHUBMIX_MODEL`、`AI_LIVE_ENABLED` 以及私有 Vercel Blob 的 `BLOB_READ_WRITE_TOKEN`。模型调用之前必须成功预占持久化额度，同一活动最多 300 次，全局每分钟 30 次、每个客户端每分钟 8 次。失败的上游请求也占用次数。正式域名使用同源 `/achievement/api/*`，独立部署使用 `/api/*`。

游戏记录保存在当前浏览器、当前域名下原有的 LocalStorage 键。普通与隐藏成就从当前记录计算 XP。完成每章全部任务后，Evil UX 只包含「盖虚拟章 → Recalculate（99.9% → 100%）」两步；结束时真实进度显示 100%，不影响 XP 或任务数据。成就页的徽章氧化预览是独立的展示效果。

[API 合约](docs/API_CONTRACT.md)
