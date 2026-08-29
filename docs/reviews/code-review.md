# DiffLedger MVP code review

Review range: `8790378...HEAD` plus the final uncommitted remediation diff.

The implementation was reviewed independently against two axes: repository
standards and the MVP PRD. Findings were reproduced where possible, fixed, and
then re-reviewed.

## Standards axis

| Finding | Severity | Resolution |
| --- | --- | --- |
| Dogfood CI executed the pull request's untrusted Policy | P1 | Dogfood now runs only after a trusted push to `main`, across the full push `before..after` range |
| Timeout killed only the immediate process | P1 | POSIX process groups and Windows `taskkill /t` terminate descendants; delayed force-kill is cancelled on close |
| Output cap applied once to each stream | P2 | stdout and stderr now share one aggregate byte budget |
| Public and source terminology used config/report for Policy/Receipt | P3 | CLI is `--policy`; modules are `policy` and `render`; user-facing language uses Receipt |

## Specification axis

| Finding | Severity | Resolution |
| --- | --- | --- |
| Deletion-heavy modified files were not signalled | P1 | Added `deletion_heavy_change` and a focused behavior test |
| Descendant process could stall the gate | P1 | Added process-tree termination and a real descendant regression test |
| Revision Receipt recorded requested branch SHA rather than analyzed merge-base | P1 | Receipt binds the effective merge-base and separately records `requestedRef` |
| Internal digest alone could be recomputed after substitution | P1 | Added `verify --digest` for comparison with an independently trusted channel; documentation states the boundary |
| Git/process/clock adapter seam was partial | P2 | `checkRepository` accepts all three adapters while retaining defaults |
| Trailing newline inflated untracked-file additions | P2 | Corrected line counting and retained real Git integration coverage |
| No reproducible demo or benchmark | P2 | Added `npm run demo`, `npm run benchmark`, recorded demo output and a 200-file baseline |

## Regression review

The remediation review also found and fixed:

- multi-commit pushes being reduced to `HEAD^..HEAD` in dogfood CI;
- a delayed SIGKILL timer remaining live after graceful termination;
- unknown CLI flags being silently accepted, which could load the wrong Policy;
- stale renamed JavaScript files remaining in the npm tarball because `dist` was
  not cleaned before compilation.

## Final verification

- Strict TypeScript typecheck: PASS
- Behavior tests: 15/15 PASS
- Demo Change Set and trusted digest verification: PASS
- 200-file benchmark: PASS
- Clean npm tarball installation and executable smoke test: PASS
- DiffLedger self-check: PASS at Policy limit 70/100, with 2/2 Evidence Checks
- `git diff --check`: PASS

No unresolved P1/P2 review findings remain. The documented MVP security limits
still apply: repository commands are not sandboxed, and the trusted digest must
come from an independent channel to detect Receipt substitution.
