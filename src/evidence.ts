import { runProcess } from "./process.js";
import type { ChangeCategory, EvidenceResult, Policy } from "./types.js";

export async function collectEvidence(
  policy: Policy,
  categories: ChangeCategory[],
  cwd: string,
  runChecks: boolean
): Promise<EvidenceResult[]> {
  const selected = policy.checks.filter((check) => check.when.includes("always") || check.when.some((category) => categories.includes(category as ChangeCategory)));
  const results: EvidenceResult[] = [];
  for (const check of selected) {
    if (!runChecks) {
      results.push({
        checkId: check.id,
        required: check.required,
        status: "skipped",
        command: [check.command, ...check.args],
        durationMs: 0,
        exitCode: null,
        stdout: "",
        stderr: "",
        outputTruncated: false
      });
      continue;
    }
    const processResult = await runProcess(check.command, check.args, {
      cwd,
      timeoutMs: check.timeoutMs,
      maxOutputBytes: policy.maxOutputBytes
    });
    const status = processResult.timedOut ? "timed_out" : processResult.error ? "error" : processResult.exitCode === 0 ? "passed" : "failed";
    results.push({
      checkId: check.id,
      required: check.required,
      status,
      command: [check.command, ...check.args],
      durationMs: processResult.durationMs,
      exitCode: processResult.exitCode,
      stdout: processResult.stdout,
      stderr: processResult.error ? `${processResult.error}\n${processResult.stderr}`.trim() : processResult.stderr,
      outputTruncated: processResult.outputTruncated
    });
  }
  return results;
}

