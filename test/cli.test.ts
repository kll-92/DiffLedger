import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

const cli = path.resolve("dist/cli.js");

function git(cwd: string, ...args: string[]): string {
  return execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
}

function createRepository(): string {
  const cwd = mkdtempSync(path.join(tmpdir(), "diffledger-test-"));
  git(cwd, "init", "-q");
  git(cwd, "config", "user.name", "DiffLedger Test");
  git(cwd, "config", "user.email", "test@diffledger.dev");
  writeFileSync(path.join(cwd, "app.ts"), "export const answer = 41;\n");
  git(cwd, "add", ".");
  git(cwd, "commit", "-qm", "initial");
  return cwd;
}

function writePolicy(cwd: string, checks: unknown[], maxRiskScore = 100): void {
  writeFileSync(path.join(cwd, ".diffledger.json"), JSON.stringify({
    schemaVersion: 1,
    maxRiskScore,
    maxOutputBytes: 4096,
    checks
  }, null, 2));
}

test("blocks a source change when required evidence does not pass", () => {
  const cwd = createRepository();
  writePolicy(cwd, [{
      id: "tests",
      command: "node",
      args: ["-e", "process.exit(1)"],
      when: ["source"],
      required: true,
      timeoutMs: 5_000
  }]);
  writeFileSync(path.join(cwd, "app.ts"), "export const answer = 42;\n");

  const result = spawnSync(process.execPath, [cli, "check", "--base", "HEAD"], {
    cwd,
    encoding: "utf8"
  });

  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stdout, /FAIL/);
  const receipt = JSON.parse(readFileSync(path.join(cwd, "diffledger.receipt.json"), "utf8"));
  assert.equal(receipt.verdict.status, "FAIL");
  assert.equal(receipt.evidenceResults[0].status, "failed");
  assert.match(receipt.integrity.digest, /^[a-f0-9]{64}$/);
  assert.ok(receipt.risk.signals.some((signal: { code: string }) => signal.code === "source_without_tests"));
});

test("passes a source change when required evidence passes", () => {
  const cwd = createRepository();
  writePolicy(cwd, [{
    id: "tests",
    command: "node",
    args: ["-e", "console.log('verified')"],
    when: ["source"],
    required: true,
    timeoutMs: 5_000
  }]);
  writeFileSync(path.join(cwd, "app.ts"), "export const answer = 42;\n");

  const result = spawnSync(process.execPath, [cli, "check", "--base", "HEAD", "--markdown", "result.md"], {
    cwd,
    encoding: "utf8"
  });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /DiffLedger PASS/);
  const receipt = JSON.parse(readFileSync(path.join(cwd, "diffledger.receipt.json"), "utf8"));
  assert.equal(receipt.verdict.status, "PASS");
  assert.equal(receipt.evidenceResults[0].stdout, "verified\n");
  assert.match(readFileSync(path.join(cwd, "result.md"), "utf8"), /# DiffLedger: PASS/);

  const verify = spawnSync(process.execPath, [cli, "verify", "diffledger.receipt.json"], { cwd, encoding: "utf8" });
  assert.equal(verify.status, 0, verify.stderr);
  assert.match(verify.stdout, /^VALID sha256:/);
});

test("blocks a Change Set when required evidence times out", () => {
  const cwd = createRepository();
  writePolicy(cwd, [{
    id: "slow-check",
    command: "node",
    args: ["-e", "setTimeout(() => {}, 10_000)"],
    when: ["source"],
    required: true,
    timeoutMs: 100
  }]);
  writeFileSync(path.join(cwd, "app.ts"), "export const answer = 42;\n");

  const result = spawnSync(process.execPath, [cli, "check", "--base", "HEAD"], {
    cwd,
    encoding: "utf8"
  });

  assert.equal(result.status, 1, result.stderr);
  const receipt = JSON.parse(readFileSync(path.join(cwd, "diffledger.receipt.json"), "utf8"));
  assert.equal(receipt.evidenceResults[0].status, "timed_out");
  assert.ok(receipt.evidenceResults[0].durationMs < 2_000);
});

test("does not select source evidence for a documentation-only Change Set", () => {
  const cwd = createRepository();
  writePolicy(cwd, [{
    id: "source-tests",
    command: "node",
    args: ["-e", "process.exit(1)"],
    when: ["source"],
    required: true,
    timeoutMs: 5_000
  }]);
  writeFileSync(path.join(cwd, "README.md"), "# Example\n");

  const result = spawnSync(process.execPath, [cli, "check", "--base", "HEAD"], {
    cwd,
    encoding: "utf8"
  });

  assert.equal(result.status, 0, result.stderr);
  const receipt = JSON.parse(readFileSync(path.join(cwd, "diffledger.receipt.json"), "utf8"));
  assert.equal(receipt.verdict.status, "PASS");
  assert.deepEqual(receipt.evidenceResults, []);
  assert.ok(receipt.changeSet.summary.categories.includes("documentation"));
});

test("detects a Receipt that was changed after it was sealed", () => {
  const cwd = createRepository();
  writePolicy(cwd, []);
  writeFileSync(path.join(cwd, "README.md"), "# Example\n");
  const check = spawnSync(process.execPath, [cli, "check", "--base", "HEAD"], { cwd, encoding: "utf8" });
  assert.equal(check.status, 0, check.stderr);

  const receiptPath = path.join(cwd, "diffledger.receipt.json");
  const receipt = JSON.parse(readFileSync(receiptPath, "utf8"));
  receipt.verdict.status = "FAIL";
  writeFileSync(receiptPath, JSON.stringify(receipt, null, 2));

  const verify = spawnSync(process.execPath, [cli, "verify", receiptPath], { cwd, encoding: "utf8" });
  assert.equal(verify.status, 1);
  assert.match(verify.stderr, /INVALID digest mismatch/);
});

test("blocks a Change Set whose risk exceeds the Policy maximum", () => {
  const cwd = createRepository();
  writePolicy(cwd, [{
    id: "tests",
    command: "node",
    args: ["-e", "process.exit(0)"],
    when: ["source"],
    required: true,
    timeoutMs: 5_000
  }], 10);
  writeFileSync(path.join(cwd, "app.ts"), "export const answer = 42;\n");

  const result = spawnSync(process.execPath, [cli, "check", "--base", "HEAD"], { cwd, encoding: "utf8" });

  assert.equal(result.status, 1, result.stderr);
  const receipt = JSON.parse(readFileSync(path.join(cwd, "diffledger.receipt.json"), "utf8"));
  assert.match(receipt.verdict.reasons[0], /exceeds Policy maximum/);
});

test("bounds captured command output in the Receipt", () => {
  const cwd = createRepository();
  writePolicy(cwd, [{
    id: "noisy",
    command: "node",
    args: ["-e", "process.stdout.write('x'.repeat(2000))"],
    when: ["source"],
    required: true,
    timeoutMs: 5_000
  }]);
  writeFileSync(path.join(cwd, ".diffledger.json"), readFileSync(path.join(cwd, ".diffledger.json"), "utf8").replace("4096", "256"));
  writeFileSync(path.join(cwd, "app.ts"), "export const answer = 42;\n");

  const result = spawnSync(process.execPath, [cli, "check", "--base", "HEAD"], { cwd, encoding: "utf8" });

  assert.equal(result.status, 0, result.stderr);
  const receipt = JSON.parse(readFileSync(path.join(cwd, "diffledger.receipt.json"), "utf8"));
  assert.equal(receipt.evidenceResults[0].stdout.length, 256);
  assert.equal(receipt.evidenceResults[0].outputTruncated, true);
});
