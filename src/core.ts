import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { sha256 } from "./canonical.js";
import { loadPolicy } from "./policy.js";
import { collectEvidence } from "./evidence.js";
import { inspectChangeSet } from "./git.js";
import { runProcess } from "./process.js";
import { sealReceipt, verifyReceipt as verifyReceiptObject } from "./receipt.js";
import { renderMarkdown } from "./render.js";
import { assessRisk } from "./risk.js";
import type { Receipt, ReceiptBody } from "./types.js";

export interface CheckOptions {
  cwd: string;
  baseRef: string;
  headRef?: string;
  policyPath?: string;
  outputPath?: string;
  markdownPath?: string;
  runChecks: boolean;
}

export interface CheckAdapters {
  inspectChangeSet: typeof inspectChangeSet;
  runProcess: typeof runProcess;
  now: () => Date;
}

export async function checkRepository(options: CheckOptions, adapterOverrides: Partial<CheckAdapters> = {}): Promise<Receipt> {
  const adapters: CheckAdapters = {
    inspectChangeSet,
    runProcess,
    now: () => new Date(),
    ...adapterOverrides
  };
  const { root, changeSet } = adapters.inspectChangeSet(options.cwd, options.baseRef, options.headRef);
  const policyPath = path.resolve(root, options.policyPath ?? ".diffledger.json");
  const policy = loadPolicy(policyPath);
  const risk = assessRisk(changeSet);
  const evidenceResults = await collectEvidence(policy, changeSet.summary.categories, root, options.runChecks, adapters.runProcess);
  const reasons: string[] = [];
  if (risk.score > policy.maxRiskScore) reasons.push(`Risk score ${risk.score} exceeds Policy maximum ${policy.maxRiskScore}.`);
  for (const result of evidenceResults) {
    if (result.required && result.status !== "passed") reasons.push(`Required Evidence Check '${result.checkId}' is ${result.status}.`);
  }
  const body: ReceiptBody = {
    schemaVersion: 1,
    tool: { name: "diffledger", version: "0.1.0" },
    createdAt: adapters.now().toISOString(),
    changeSet,
    policy: {
      path: path.relative(root, policyPath) || path.basename(policyPath),
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

export function verifyReceiptFile(filePath: string, trustedDigest?: string): ReturnType<typeof verifyReceiptObject> {
  let input: unknown;
  try {
    input = JSON.parse(readFileSync(filePath, "utf8"));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { valid: false, error: `Could not read Receipt: ${message}` };
  }
  const result = verifyReceiptObject(input);
  if (!result.valid || trustedDigest === undefined) return result;
  if (result.actual === undefined) return { valid: false, error: "Receipt verification produced no digest." };
  const normalized = trustedDigest.replace(/^sha256:/, "").toLowerCase();
  if (result.actual !== normalized) {
    return {
      valid: false,
      expected: normalized,
      actual: result.actual,
      error: "Receipt does not match the independently trusted digest."
    };
  }
  return result;
}
