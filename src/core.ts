import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { sha256 } from "./canonical.js";
import { loadPolicy } from "./config.js";
import { collectEvidence } from "./evidence.js";
import { inspectChangeSet } from "./git.js";
import { sealReceipt, verifyReceipt as verifyReceiptObject } from "./receipt.js";
import { renderMarkdown } from "./report.js";
import { assessRisk } from "./risk.js";
import type { Receipt, ReceiptBody } from "./types.js";

export interface CheckOptions {
  cwd: string;
  baseRef: string;
  headRef?: string;
  configPath?: string;
  outputPath?: string;
  markdownPath?: string;
  runChecks: boolean;
  now?: () => Date;
}

export async function checkRepository(options: CheckOptions): Promise<Receipt> {
  const { root, changeSet } = inspectChangeSet(options.cwd, options.baseRef, options.headRef);
  const configPath = path.resolve(root, options.configPath ?? ".diffledger.json");
  const policy = loadPolicy(configPath);
  const risk = assessRisk(changeSet);
  const evidenceResults = await collectEvidence(policy, changeSet.summary.categories, root, options.runChecks);
  const reasons: string[] = [];
  if (risk.score > policy.maxRiskScore) reasons.push(`Risk score ${risk.score} exceeds Policy maximum ${policy.maxRiskScore}.`);
  for (const result of evidenceResults) {
    if (result.required && result.status !== "passed") reasons.push(`Required Evidence Check '${result.checkId}' is ${result.status}.`);
  }
  const body: ReceiptBody = {
    schemaVersion: 1,
    tool: { name: "diffledger", version: "0.1.0" },
    createdAt: (options.now ?? (() => new Date()))().toISOString(),
    changeSet,
    policy: {
      path: path.relative(root, configPath) || path.basename(configPath),
      digest: sha256(policy),
      maxRiskScore: policy.maxRiskScore
    },
    risk,
    evidenceResults,
    verdict: { status: reasons.length === 0 ? "PASS" : "FAIL", reasons }
  };
  const receipt = sealReceipt(body);
  const outputPath = path.resolve(root, options.outputPath ?? "diffledger.receipt.json");
  writeFileSync(outputPath, `${JSON.stringify(receipt, null, 2)}\n`);
  if (options.markdownPath !== undefined) writeFileSync(path.resolve(root, options.markdownPath), renderMarkdown(receipt));
  return receipt;
}

export function verifyReceiptFile(filePath: string): ReturnType<typeof verifyReceiptObject> {
  let input: unknown;
  try {
    input = JSON.parse(readFileSync(filePath, "utf8"));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { valid: false, error: `Could not read Receipt: ${message}` };
  }
  return verifyReceiptObject(input);
}
