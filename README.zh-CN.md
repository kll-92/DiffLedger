# DiffLedger

**让每一次代码变更拿出证据。**

DiffLedger 是一个面向人类和编码 Agent 产出代码的本地证据门禁。它分析
Git Change Set 的风险，执行仓库声明的 Evidence Checks，给出确定性的
PASS/FAIL Verdict，并生成可离线验真的 Receipt。

它不是另一个 AI 代码评审机器人。没有账号、API Key、模型和网络时，核心
能力仍可完整运行。

## 快速开始

需要 Node.js 20+ 和 Git。

```bash
npm install
npm run build
node dist/cli.js init

# 执行前先审查 .diffledger.json，因为其中的检查会使用当前用户权限运行。
node dist/cli.js check --base HEAD --markdown diffledger.receipt.md
node dist/cli.js verify diffledger.receipt.json
# 更强的校验：与从可信 CI 渠道单独取得的摘要比较
node dist/cli.js verify diffledger.receipt.json --digest <trusted-sha256>
```

输出示例：

```text
DiffLedger PASS
Change Set  12 files, +438/-71
Risk        45/100 (medium)
Evidence    2/2 passed
Receipt     sha256:4b7ac0eac738d60e...
```

## 核心能力

- 同时识别已暂存、未暂存和未跟踪文件
- 分类 source、test、dependency、migration、workflow、security 等路径
- 用稳定 reason code 输出透明的 Risk Signals
- 按变更类别选择项目已有的测试、类型检查或安全扫描
- 不经 shell 拼接命令，并限制写入 Receipt 的日志长度
- 输出 JSON、Markdown 和可用于 CI 的退出码
- 通过规范 JSON 和 SHA-256 检查 Receipt 完整性，并可与独立可信摘要比较

Receipt 内置摘要可以发现未重算摘要的内容修改；若攻击者能同时修改内容并重算
摘要，则必须使用来自独立可信渠道的 `--digest` 才能发现替换。它不证明执行者
身份，也不等同于数字签名、沙箱或远程证明。完整设计、竞品调研和范围取舍见
[PRD](./docs/PRD.md) 与[市场调研](./docs/research/market-research.md)。

详细配置、架构、安全模型和路线图请阅读[英文 README](./README.md)。

运行 `npm run demo` 可以创建一个临时 Git 仓库，完成一次包含功能代码、测试和
GitHub Workflow 的真实检查，并通过独立摘要验证 Receipt；`npm run benchmark`
可重复运行 200 文件基准测试。
