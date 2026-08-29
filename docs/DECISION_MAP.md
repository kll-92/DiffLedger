# DiffLedger 决策地图

## #1: 选择哪个旗舰项目？

Blocked by: none
Type: Research

### Question

哪个方向同时具备真实需求、差异化、工程深度和短期可交付性？

### Answer

选择 DiffLedger：面向 AI 生成代码时代的变更证据门禁。竞品与评分见 [市场调研](./research/market-research.md)。

## #2: 核心是 AI 评审还是确定性验证？

Blocked by: #1
Type: Research

### Question

产品的核心裁决是否依赖 LLM？

### Answer

不依赖。风险识别、证据执行、策略裁决和收据完整性全部确定性运行；AI 只作为未来可选解释器。

## #3: MVP 的最小闭环是什么？

Blocked by: #1, #2
Type: Discuss

### Question

第一版必须包含什么，明确不包含什么？

### Answer

包含 CLI 初始化、Git diff 分析、风险分类、配置驱动的证据命令、PASS/FAIL、JSON/Markdown 收据和离线验真。不包含 Web 服务、账号、计费、LLM、Docker 沙箱和 GitHub App。

## #4: 主要公开接口与测试 seam 在哪里？

Blocked by: #3
Type: Prototype

### Question

怎样让真实用户接口同时成为稳定测试接口？

### Answer

以 `diffledger` CLI 为唯一外部 seam。集成测试在临时 Git 仓库中调用编译后的 CLI，验证退出码、收据和可观察文件；领域算法可用少量公共函数做精确边界测试。

## #5: 收据是否采用正式 in-toto 格式？

Blocked by: #3
Type: Research

### Question

第一版是否直接生成签名 in-toto attestation？

### Answer

暂不。先输出版本化、规范序列化并带 SHA-256 摘要的内部收据，字段设计保留映射到 in-toto Statement/Predicate 的空间。签名会引入身份、密钥和远程信任问题，超出 MVP。

## #6: 何时开始实现？

Blocked by: #1, #2, #3, #4, #5
Type: Discuss

### Question

规划是否足够清晰，可以进入实现？

### Answer

是。PRD 审查通过后进入测试先行实现。

