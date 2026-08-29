# DiffLedger MVP PRD 审查

审查日期：2026-08-30

## 价值审查

**通过。** 目标用户、触发场景和输出价值可以用一句话解释：编码 Agent 提交 Change Set 后，DiffLedger 要求它拿出可复现的 Evidence Results。它不是泛化的“代码质量更好”，而是减少合并决策中的信息搜寻和不可验证主张。

## 差异化审查

**通过，但需持续守住边界。** 不得把 README 主叙事写成 AI code reviewer。核心差异是确定性、无模型依赖、风险驱动的 Evidence Checks 和可验真的 Receipt。PatchProof 已覆盖 bug fail-to-pass，因此 Demo 必须至少包含依赖、工作流或迁移类型的非 bug Change Set。

## 可行性审查

**通过。** Node、Git 和 Docker 在本地可用。MVP 不需要外部账号、数据库或付费 API。最大的实现风险是跨平台进程管理和 Git diff 解析，均可通过参数数组、NUL 分隔输出和临时仓库集成测试控制。

## 安全审查

**有条件通过。** Evidence Check 会执行仓库命令，必须满足：

1. 不通过 shell 拼接命令。
2. CLI 和 README 清楚说明 Policy 必须来自受信任来源。
3. 输出长度受限，避免 Receipt 意外包含大量日志。
4. 不将“SHA-256 完整性”描述为签名或可信远程证明。

以上条件已写入 PRD，必须在实现与文档中验证。

## 范围审查

**通过。** Web UI、GitHub App、LLM 和 Docker 沙箱全部延后。首版只交付一个完整 CLI 闭环。若实现时间不足，优先保留 `check` 和 `verify`，不能牺牲 Receipt 完整性去做视觉功能。

## 测试审查

**通过。** 主要 seam 是真实 CLI + 临时 Git 仓库。优先级依次为：

1. 风险触发并缺少证据时阻断。
2. 所需证据通过时放行。
3. Evidence Check 失败或超时阻断。
4. Receipt 篡改可被发现。
5. 文档变更不误触发源代码证据。

## Go / No-Go

**GO。** PRD 可以进入测试先行实现。发布前需要再次执行安全、标准和规格双轴代码审查。

