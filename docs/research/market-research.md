# DiffLedger 市场与竞品调研

调研日期：2026-08-30

## 结论

应当开发一个本地优先、确定性判定的“代码变更证据门禁”，而不是另一个 AI PR 评论机器人。产品暂定名 **DiffLedger**：分析 Git diff 的风险信号，执行项目声明的证据检查，并生成可离线验真的收据。

它解决的问题是：编码 Agent 能快速产出 diff，但维护者仍需要回答“这次变更声称解决了什么、风险在哪里、哪些验证真的执行过、结果是否被修改过”。现有工具分别擅长生成评论、运行静态分析或证明单个 bug 的 fail-to-pass，缺少面向所有变更类型的轻量“主张—风险—证据—裁决”闭环。

## 趋势证据

- GitHub Octoverse 2025 报告显示 TypeScript 成为 GitHub 使用人数最多的语言，Python 继续主导 AI 项目；使用 Dockerfile 的仓库显著增长。这支持用 TypeScript 构建可分发 CLI，并将容器隔离作为后续能力。
- GitHub 对 AI 时代开发者能力的研究把“理解任务、指挥工作、验证结果”列为关键能力。生成越来越便宜，验证成为新的瓶颈。
- GitHub 已提供 Artifact Attestations，并明确指出“生成证明本身不保证软件安全，消费者仍需定义并检查策略”。DiffLedger 补的是产生结构化验证结果和策略裁决这一层。
- in-toto Attestation Framework 将证明建模为“关于软件制品及生产过程的可验证声明”。DiffLedger 的收据可先采用兼容这种思想的内部 schema，后续输出正式 in-toto predicate。

主要资料：

- [GitHub Octoverse 2025](https://github.blog/news-insights/octoverse/octoverse-a-new-developer-joins-github-every-second-as-ai-leads-typescript-to-1/)
- [GitHub: the new identity of a developer](https://github.blog/news-insights/octoverse/the-new-identity-of-a-developer-what-changes-and-what-doesnt-in-the-ai-era/)
- [GitHub Artifact Attestations](https://docs.github.com/en/actions/concepts/security/artifact-attestations)
- [in-toto Attestation Framework](https://github.com/in-toto/attestation)

## 竞品扫描

调研通过 GitHub Search API 和各项目 README 完成；Star 数是 2026-08-30 的快照，只作为需求热度信号，不作为产品质量结论。

| 产品 | 快照 | 主要能力 | DiffLedger 的差异 |
| --- | ---: | --- | --- |
| The-PR-Agent/pr-agent | 12.7k stars | LLM 驱动的 PR 描述、评审和改进建议 | 不依赖模型；执行并记录证据，而非只生成意见 |
| reviewdog/reviewdog | 9.5k stars | 将各种 lint 结果映射成代码评审评论 | 聚合的是“变更主张与证据”，并做风险驱动的门禁裁决 |
| promptfoo/promptfoo | 24.6k stars | 测试和红队评估 Prompt、Agent、RAG | DiffLedger 评估 Agent 最终产出的代码变更，而非 Agent/模型本身 |
| imbue-ai/vet | 540 stars | 使用 LLM 检查代码变更和 Agent 行为 | DiffLedger 的核心结果可复现、无模型、无 API Key |
| kwlck/PatchProof | 27 stars | 证明 bug 在 base 失败、在 head 通过 | DiffLedger 覆盖 feature、refactor、migration、dependency、CI 等通用变更 |
| OpenSSF Scorecard | 10k stars | 仓库级供应链安全评分 | DiffLedger 面向一次 diff 的合并决策 |
| StepSecurity Harden Runner | 1.2k stars | CI Runner 行为和网络安全监控 | 可作为未来证据来源，而不是直接竞品 |

## 发现的空白

1. **意见很多，证据分散。** CI 检查散落在日志中，PR 评论很难回答某一项产品主张由哪条证据支持。
2. **门禁通常与技术栈绑定。** lint、测试、扫描器各自输出不同格式，缺少轻量的统一收据。
3. **AI 评审难以复现。** 模型、上下文和温度变化会改变结果；确定性检查更适合作为必须通过的底座。
4. **风险与验证没有联动。** 修改工作流、数据库迁移或鉴权代码时，应自动提高证据要求，而不仅是跑同一套测试。
5. **验证结果缺少便携完整性。** JSON 日志容易被手工修改；内容寻址的收据能让本地、CI 和评审者确认看到的是同一份结果。

## 候选项目评分

满分 5 分，权重：真实需求 30%、差异化 25%、工程展示 25%、MVP 可行性 20%。

| 方向 | 需求 | 差异化 | 工程展示 | 可行性 | 加权 |
| --- | ---: | ---: | ---: | ---: | ---: |
| 通用 AI PR 评论机器人 | 5 | 1 | 3 | 4 | 3.20 |
| 本地个人数据助手 | 4 | 3 | 4 | 2 | 3.35 |
| API 契约漂移监测 | 4 | 4 | 4 | 3 | 3.80 |
| 故障回放平台 | 5 | 4 | 5 | 2 | 4.15 |
| **DiffLedger 变更证据门禁** | **5** | **4** | **5** | **4** | **4.55** |

DiffLedger 胜出是因为它能先以一个零云依赖 CLI 形成完整闭环，之后自然扩展到 GitHub Action、Web 报告、Agent 协议和供应链证明。

## 用户与使用场景

首要用户是正在采用编码 Agent 的个人开发者和开源维护者。典型场景：

1. Agent 完成任务后运行 `diffledger check --base main`。
2. DiffLedger 识别本次修改包含源代码、依赖或高风险路径。
3. 它根据仓库策略执行测试、类型检查或安全扫描。
4. 它输出 PASS/FAIL、风险解释以及带 SHA-256 完整性摘要的 JSON/Markdown 收据。
5. CI 用退出码阻止缺少关键证据的变更合并。

## 成功指标

MVP 阶段：

- 新用户在 3 分钟内完成初始化并生成第一份收据。
- 在仓库 fixture 中稳定识别不少于 8 类风险信号。
- 收据被修改后，离线验证必须失败。
- 无网络、无 API Key 时全部核心能力可用。
- GitHub Actions 中可以用一个工作流运行并上传 Markdown/JSON 结果。

公开发布后：

- 10 个真实仓库试用。
- 3 个外部贡献者或有效 Issue。
- 至少发现 5 次“测试全绿但变更证据不完整”的真实案例。

## 风险与对策

| 风险 | 对策 |
| --- | --- |
| 与已有代码评审产品看起来相似 | 始终使用 evidence gate，而不是 AI reviewer 的产品语言；Demo 展示同一 diff 的证据缺口 |
| 规则误报 | 风险只触发透明、可配置的证据要求；每个裁决包含机器可读原因 |
| 执行仓库命令带来安全问题 | MVP 明确只运行受信任配置；CI 中从 base 分支加载策略；后续增加 Docker 沙箱 |
| 范围膨胀 | MVP 只做 CLI、JSON 配置、风险引擎、命令证据、收据和离线验真 |
| 名称冲突 | GitHub 精确仓库名、npm `diffledger` 和 `@diffledger/cli` 在调研时均未占用；发布前再次检查 |

