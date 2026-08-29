# DiffLedger MVP PRD

状态：Approved for implementation

## Problem Statement

使用编码 Agent 的开发者可以很快得到一个看似完整的代码变更，但仍要手工浏览 diff、寻找散落的 CI 日志，并判断测试是否覆盖了变更风险。现有 AI 代码评审会再生成一层意见，却不能稳定证明哪些验证真实执行过。开发者需要一种本地、透明、可复现的方式，把代码变更、风险、验证结果和最终合并裁决放进同一份可验真的记录。

## Solution

DiffLedger 提供一个零云依赖 CLI。它比较 Git 基准与目标，识别风险信号，根据仓库 Policy 选择并执行 Evidence Checks，产生明确 Verdict，并将全过程写入带完整性摘要的 JSON Receipt，同时可渲染为 Markdown。用户可以离线验证 Receipt 是否被修改，CI 可以使用退出码作为合并门禁。

## User Stories

1. As a developer, I want to initialize DiffLedger with one command, so that I can adopt it without studying a large configuration language.
2. As a developer, I want to compare my working tree with a Git base ref, so that uncommitted Agent changes can be checked before commit.
3. As a maintainer, I want to compare two committed revisions, so that the same tool works in CI.
4. As a reviewer, I want to see changed, added, deleted and renamed files, so that the analyzed scope is explicit.
5. As a reviewer, I want additions and deletions summarized, so that unusually large changes are visible.
6. As a maintainer, I want workflow changes identified as risky, so that CI permission changes receive extra scrutiny.
7. As a maintainer, I want dependency manifest and lockfile changes identified, so that supply-chain changes receive evidence.
8. As a maintainer, I want migration changes identified, so that irreversible data changes receive evidence.
9. As a maintainer, I want authentication and security-sensitive paths identified, so that critical code does not look like an ordinary refactor.
10. As a maintainer, I want source changes without test changes identified, so that missing regression evidence is visible.
11. As a maintainer, I want large or deletion-heavy diffs identified, so that review scope can be controlled.
12. As a developer, I want every risk signal to include a code and explanation, so that the Verdict is understandable and configurable.
13. As a developer, I want to declare Evidence Checks in a repository Policy, so that each project can use its existing test and analysis tools.
14. As a developer, I want Evidence Checks to apply only to matching change categories, so that documentation-only changes do not run the full suite.
15. As a developer, I want required and optional Evidence Checks, so that informational checks do not block all work.
16. As a developer, I want per-check timeouts, so that a hung tool cannot stall the gate indefinitely.
17. As a reviewer, I want an Evidence Result to record exit status and duration, so that a claimed success has observable support.
18. As a reviewer, I want bounded stdout and stderr in the Receipt, so that useful failure context is preserved without creating unbounded artifacts.
19. As a maintainer, I want missing required evidence to fail the Verdict, so that configuration mistakes cannot silently pass.
20. As a maintainer, I want failed or timed-out required evidence to fail the Verdict, so that CI can block unsafe merges.
21. As a developer, I want a successful check to exit zero and a failed gate to exit non-zero, so that any CI system can consume it.
22. As a reviewer, I want a versioned JSON Receipt, so that tools can consume it without parsing terminal text.
23. As a reviewer, I want a human-readable Markdown rendering, so that results can be posted to a pull request summary.
24. As a reviewer, I want the Receipt to bind base revision, target revision/worktree digest and Policy digest, so that I know what was evaluated.
25. As a reviewer, I want an offline verify command, so that edits to the Receipt are detected without rerunning repository code.
26. As a security-conscious user, I want the tool to state that configured commands execute with my permissions, so that the trust model is not hidden.
27. As an open-source contributor, I want no API key or account requirement, so that I can try the complete core product locally.
28. As a project owner, I want example Policy and CI files, so that adoption takes minutes rather than hours.
29. As a future integrator, I want stable schema and machine-readable reason codes, so that a GitHub App or Agent can consume results later.
30. As a portfolio reviewer, I want architecture, trade-offs, benchmarks and a real demo documented, so that the project demonstrates more than CRUD implementation.

## Implementation Decisions

- The first release is a Node.js 20+ CLI written in strict TypeScript with no production runtime dependencies.
- The `diffledger` executable exposes `init`, `check`, and `verify` commands. This CLI is the primary external seam and integration-test surface.
- Policy is stored as `.diffledger.json` to avoid requiring a YAML parser in the zero-dependency MVP.
- A Policy contains a schema version, risk threshold, output limits, and a list of Evidence Checks.
- Each Evidence Check has a stable ID, command plus arguments, change-category selectors, required flag and timeout. Commands are executed without a shell to reduce injection ambiguity.
- Git information is obtained by invoking Git with argument arrays. Working-tree mode compares a base ref with the current files; revision mode computes a merge base before comparing revisions.
- Change classification recognizes source, test, documentation, dependency, migration, workflow, security and configuration categories.
- Risk scoring is additive, capped at 100, and composed from stable Risk Signal codes. A risk threshold can block a change even when commands pass.
- Required Evidence Checks selected by the Change Set must all pass. Spawn failure, non-zero exit or timeout produces a failing Evidence Result.
- Receipt JSON uses a schema version and stable ordering. The Receipt Digest is SHA-256 over canonical JSON excluding the digest field itself.
- Receipt integrity proves only that content has not changed since the digest was produced; it does not prove signer identity or trustworthy execution. Documentation must state this distinction.
- Console, JSON and Markdown are renderings of the same Receipt, not separate sources of truth.
- CI examples use least-privilege read-only permissions and upload the generated Receipt as an artifact. Marketplace packaging is deferred until the CLI interface stabilizes.
- The package is structured around one deep orchestration module that accepts repository, clock and process adapters internally. Callers learn one `check` interface; tests can substitute adapters only where real Git/process execution is impractical.

## Testing Decisions

- Tests assert external behavior and stable domain outcomes, not internal call order.
- The highest test seam is the compiled CLI running against temporary real Git repositories.
- The first tracer test initializes a repository, changes a source file without tests, runs `check`, and observes a failing Verdict and valid Receipt.
- Integration tests cover a passing source change with selected evidence, failing evidence, timeout, documentation-only changes, and Receipt tampering.
- Focused domain tests cover path classification, risk caps and canonical digest stability where integration failures would otherwise be hard to diagnose.
- No network calls are permitted in the test suite.
- The full suite runs on Linux, macOS and Windows-compatible Node APIs; Git-specific tests may normalize path separators and line endings.

## Out of Scope

- LLM-generated review comments or automatic fixes.
- Hosted dashboard, accounts, teams, billing or persistent database.
- GitHub App installation and webhook handling.
- Docker/VM sandbox execution.
- Cryptographic signatures, identities, transparency logs or claims of remote attestation.
- Formal in-toto predicate publication.
- Language-specific AST or coverage analysis.
- Automatic discovery of every project's correct test command.
- Support for non-Git version control systems.

## Further Notes

- The MVP optimizes for a three-minute first success and an auditable trust model.
- `init` may suggest common commands by inspecting package metadata, but generated configuration must remain explicit and editable.
- Future milestones include base-branch Policy loading, Docker isolation, in-toto output, GitHub Checks, SARIF ingestion, Agent session linkage and a local Web report.
- Product and domain language must use Change Set, Risk Signal, Evidence Check, Evidence Result, Policy, Verdict, Receipt and Receipt Digest as defined in `CONTEXT.md`.

