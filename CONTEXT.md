# DiffLedger

DiffLedger 描述代码变更为何值得信任，以及支撑合并决定的证据。

## Language

**Change Set**:
从一个基准修订到目标工作树或目标修订之间的文件变化集合。
_Avoid_: PR, patch, commit

**Risk Signal**:
从 Change Set 中确定性识别出的、需要额外验证关注的事实。
_Avoid_: issue, warning, AI finding

**Evidence Check**:
仓库策略声明的、可执行并产生结果的验证要求。
_Avoid_: test, job, command

**Evidence Result**:
一次 Evidence Check 的实际执行记录，包括状态、耗时和输出摘要。
_Avoid_: log, CI result

**Policy**:
仓库对 Change Set 所需证据和可接受风险的声明。
_Avoid_: config, rules

**Verdict**:
Policy 对 Risk Signals 和 Evidence Results 的确定性裁决。
_Avoid_: score, review, opinion

**Receipt**:
将 Change Set、Risk Signals、Evidence Results 和 Verdict 绑定在一起的、可验证完整性的记录。
_Avoid_: report, attestation, log bundle

**Receipt Digest**:
通过规范序列化 Receipt 内容计算出的完整性摘要。
_Avoid_: signature, proof

