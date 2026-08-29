import { readFileSync } from "node:fs";
import type { ChangeCategory, EvidenceCheck, Policy } from "./types.js";

const CATEGORIES = new Set<ChangeCategory | "always">([
  "always", "source", "test", "documentation", "dependency", "migration",
  "workflow", "security", "configuration"
]);

function fail(message: string): never {
  throw new Error(`Invalid Policy: ${message}`);
}

export function parsePolicy(input: unknown): Policy {
  if (typeof input !== "object" || input === null || Array.isArray(input)) fail("root must be an object");
  const value = input as Record<string, unknown>;
  if (value.schemaVersion !== 1) fail("schemaVersion must be 1");
  if (!Number.isInteger(value.maxRiskScore) || Number(value.maxRiskScore) < 0 || Number(value.maxRiskScore) > 100) fail("maxRiskScore must be an integer from 0 to 100");
  if (!Number.isInteger(value.maxOutputBytes) || Number(value.maxOutputBytes) < 256 || Number(value.maxOutputBytes) > 1_000_000) fail("maxOutputBytes must be between 256 and 1000000");
  if (!Array.isArray(value.checks)) fail("checks must be an array");
  const ids = new Set<string>();
  const checks: EvidenceCheck[] = value.checks.map((raw, index) => {
    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) fail(`checks[${index}] must be an object`);
    const check = raw as Record<string, unknown>;
    if (typeof check.id !== "string" || !/^[a-z][a-z0-9-]{0,63}$/.test(check.id)) fail(`checks[${index}].id must be a lowercase identifier`);
    if (ids.has(check.id)) fail(`duplicate check id: ${check.id}`);
    ids.add(check.id);
    if (typeof check.command !== "string" || check.command.length === 0) fail(`${check.id}.command must be a non-empty string`);
    if (!Array.isArray(check.args) || !check.args.every((arg) => typeof arg === "string")) fail(`${check.id}.args must be a string array`);
    if (!Array.isArray(check.when) || check.when.length === 0 || !check.when.every((category) => typeof category === "string" && CATEGORIES.has(category as ChangeCategory | "always"))) fail(`${check.id}.when contains an unknown category`);
    if (typeof check.required !== "boolean") fail(`${check.id}.required must be boolean`);
    if (!Number.isInteger(check.timeoutMs) || Number(check.timeoutMs) < 100 || Number(check.timeoutMs) > 3_600_000) fail(`${check.id}.timeoutMs must be between 100 and 3600000`);
    return {
      id: check.id,
      command: check.command,
      args: [...check.args] as string[],
      when: [...check.when] as Array<ChangeCategory | "always">,
      required: check.required,
      timeoutMs: Number(check.timeoutMs)
    };
  });
  return {
    schemaVersion: 1,
    maxRiskScore: Number(value.maxRiskScore),
    maxOutputBytes: Number(value.maxOutputBytes),
    checks
  };
}

export function loadPolicy(filePath: string): Policy {
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(filePath, "utf8"));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Could not read Policy at ${filePath}: ${message}`);
  }
  return parsePolicy(parsed);
}

