import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { performance } from "node:perf_hooks";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cli = path.join(projectRoot, "dist/cli.js");
const repository = mkdtempSync(path.join(tmpdir(), "diffledger-benchmark-"));

function git(...args) {
  return execFileSync("git", args, { cwd: repository, stdio: "ignore" });
}

try {
  git("init", "-q");
  git("config", "user.name", "DiffLedger Benchmark");
  git("config", "user.email", "benchmark@diffledger.dev");
  writeFileSync(path.join(repository, ".gitignore"), "diffledger.receipt.json\n");
  for (let index = 0; index < 200; index += 1) {
    writeFileSync(path.join(repository, `module-${index}.ts`), `export const value${index} = ${index};\n`);
  }
  git("add", ".");
  git("commit", "-qm", "baseline");
  for (let index = 0; index < 200; index += 1) {
    writeFileSync(path.join(repository, `module-${index}.ts`), `export const value${index} = ${index + 1};\n`);
  }
  writeFileSync(path.join(repository, ".diffledger.json"), `${JSON.stringify({
    schemaVersion: 1,
    maxRiskScore: 100,
    maxOutputBytes: 4096,
    checks: []
  })}\n`);

  const durations = [];
  for (let run = 0; run < 6; run += 1) {
    const started = performance.now();
    const result = spawnSync(process.execPath, [cli, "check", "--base", "HEAD"], {
      cwd: repository,
      encoding: "utf8"
    });
    const duration = performance.now() - started;
    if (result.status !== 0) throw new Error(result.stderr || result.stdout);
    if (run > 0) durations.push(duration);
  }
  durations.sort((a, b) => a - b);
  const median = durations[Math.floor(durations.length / 2)];
  process.stdout.write(`${JSON.stringify({
    scenario: "200 modified TypeScript files, no Evidence Checks",
    runs: durations.length,
    medianMs: Math.round(median),
    minMs: Math.round(durations[0]),
    maxMs: Math.round(durations.at(-1)),
    node: process.version,
    platform: `${process.platform}/${process.arch}`
  }, null, 2)}\n`);
} finally {
  rmSync(repository, { recursive: true, force: true });
}
