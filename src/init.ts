import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { EvidenceCheck, Policy } from "./types.js";

function packageScripts(cwd: string): Record<string, string> {
  const packagePath = path.join(cwd, "package.json");
  if (!existsSync(packagePath)) return {};
  try {
    const value = JSON.parse(readFileSync(packagePath, "utf8")) as { scripts?: Record<string, string> };
    return value.scripts ?? {};
  } catch {
    return {};
  }
}

export function initializePolicy(cwd: string, force: boolean): string {
  const output = path.join(cwd, ".diffledger.json");
  if (existsSync(output) && !force) throw new Error(".diffledger.json already exists. Use --force to replace it.");
  const scripts = packageScripts(cwd);
  const checks: EvidenceCheck[] = [];
  if (scripts.typecheck) checks.push({ id: "typecheck", command: "npm", args: ["run", "typecheck"], when: ["source", "test", "configuration"], required: true, timeoutMs: 120_000 });
  if (scripts.test) checks.push({ id: "tests", command: "npm", args: ["test"], when: ["source", "test"], required: true, timeoutMs: 300_000 });
  const policy: Policy = {
    schemaVersion: 1,
    maxRiskScore: 70,
    maxOutputBytes: 16_384,
    checks
  };
  writeFileSync(output, `${JSON.stringify(policy, null, 2)}\n`);
  return output;
}

