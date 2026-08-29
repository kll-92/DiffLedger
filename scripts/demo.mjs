import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cli = path.join(projectRoot, "dist/cli.js");
const repository = mkdtempSync(path.join(tmpdir(), "diffledger-demo-"));

function git(...args) {
  return execFileSync("git", args, { cwd: repository, encoding: "utf8" }).trim();
}

try {
  git("init", "-q");
  git("config", "user.name", "DiffLedger Demo");
  git("config", "user.email", "demo@diffledger.dev");
  writeFileSync(path.join(repository, ".gitignore"), "diffledger.receipt.*\n");
  writeFileSync(path.join(repository, "checkout.ts"), "export const total = (price: number) => price;\n");
  writeFileSync(path.join(repository, "checkout.test.ts"), "// baseline checkout test\n");
  git("add", ".");
  git("commit", "-qm", "baseline");

  mkdirSync(path.join(repository, ".github", "workflows"), { recursive: true });
  writeFileSync(path.join(repository, "checkout.ts"), "export const total = (price: number, discount = 0) => price - discount;\n");
  writeFileSync(path.join(repository, "checkout.test.ts"), "// verifies discounted checkout totals\n");
  writeFileSync(path.join(repository, ".github", "workflows", "release.yml"), "name: Release\non: workflow_dispatch\n");
  writeFileSync(path.join(repository, ".diffledger.json"), `${JSON.stringify({
    schemaVersion: 1,
    maxRiskScore: 70,
    maxOutputBytes: 4096,
    checks: [{
      id: "checkout-tests",
      command: "node",
      args: ["-e", "console.log('3 checkout scenarios passed')"],
      when: ["source", "test"],
      required: true,
      timeoutMs: 5_000
    }]
  }, null, 2)}\n`);

  const checked = spawnSync(process.execPath, [cli, "check", "--base", "HEAD", "--markdown", "diffledger.receipt.md"], {
    cwd: repository,
    encoding: "utf8"
  });
  process.stdout.write("$ diffledger check --base HEAD\n");
  process.stdout.write(checked.stdout);
  if (checked.status !== 0) throw new Error(checked.stderr || "Demo Change Set unexpectedly failed.");

  const receipt = JSON.parse(readFileSync(path.join(repository, "diffledger.receipt.json"), "utf8"));
  const verified = spawnSync(process.execPath, [cli, "verify", "diffledger.receipt.json", "--digest", receipt.integrity.digest], {
    cwd: repository,
    encoding: "utf8"
  });
  process.stdout.write("\n$ diffledger verify diffledger.receipt.json --digest <trusted>\n");
  process.stdout.write(verified.stdout);
  if (verified.status !== 0) throw new Error(verified.stderr || "Demo Receipt verification failed.");
} finally {
  rmSync(repository, { recursive: true, force: true });
}
