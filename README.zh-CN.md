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
- 通过规范 JSON 和 SHA-256 发现 Receipt 被修改

Receipt Digest 只证明内容自生成后没有改变，不证明执行者身份，也不等同于
数字签名、沙箱或远程证明。完整设计、竞品调研和范围取舍见
[PRD](./docs/PRD.md) 与[市场调研](./docs/research/market-research.md)。

详细配置、架构、安全模型和路线图请阅读[英文 README](./README.md)。
