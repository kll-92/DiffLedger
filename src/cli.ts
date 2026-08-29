#!/usr/bin/env node
import path from "node:path";
import { checkRepository, verifyReceiptFile } from "./core.js";
import { initializePolicy } from "./init.js";
import { renderConsole, renderMarkdown } from "./report.js";

interface ParsedArgs {
  positional: string[];
  flags: Map<string, string | boolean>;
}

function parseArgs(args: string[]): ParsedArgs {
  const positional: string[] = [];
  const flags = new Map<string, string | boolean>();
  for (let index = 0; index < args.length; index += 1) {
    const value = args[index]!;
    if (!value.startsWith("--")) {
      positional.push(value);
      continue;
    }
    const name = value.slice(2);
    if (["force", "no-run", "help"].includes(name)) {
      flags.set(name, true);
      continue;
    }
    const next = args[index + 1];
    if (next === undefined || next.startsWith("--")) throw new Error(`--${name} requires a value.`);
    flags.set(name, next);
    index += 1;
  }
  return { positional, flags };
}

function stringFlag(parsed: ParsedArgs, name: string): string | undefined {
  const value = parsed.flags.get(name);
  return typeof value === "string" ? value : undefined;
}

function help(): string {
  return `DiffLedger — evidence gates for code changes

Usage:
  diffledger init [--force]
  diffledger check [--base <ref>] [--head <ref>] [--config <path>]
                   [--output <path>] [--markdown <path>]
                   [--format console|json|markdown] [--no-run]
  diffledger verify [receipt.json]

Security: Evidence Checks execute trusted Policy commands directly with your
current user permissions. Review .diffledger.json before running it.
`;
}

async function main(): Promise<number> {
  const [command, ...rest] = process.argv.slice(2);
  if (!command || command === "help" || command === "--help" || command === "-h") {
    process.stdout.write(help());
    return 0;
  }
  const parsed = parseArgs(rest);
  if (command === "init") {
    const output = initializePolicy(process.cwd(), parsed.flags.has("force"));
    process.stdout.write(`Created ${path.basename(output)}\nReview this trusted Policy before running Evidence Checks.\n`);
    return 0;
  }
  if (command === "verify") {
    const filePath = path.resolve(parsed.positional[0] ?? "diffledger.receipt.json");
    const result = verifyReceiptFile(filePath);
    if (!result.valid) {
      process.stderr.write(`INVALID ${result.error ?? `digest mismatch: expected ${result.expected}, calculated ${result.actual}`}\n`);
      return 1;
    }
    process.stdout.write(`VALID sha256:${result.actual}\n`);
    return 0;
  }
  if (command !== "check") throw new Error(`Unknown command: ${command}`);
  const format = stringFlag(parsed, "format") ?? "console";
  if (!["console", "json", "markdown"].includes(format)) throw new Error("--format must be console, json, or markdown.");
  const outputPath = stringFlag(parsed, "output");
  const markdownPath = stringFlag(parsed, "markdown");
  const checkOptions = {
    cwd: process.cwd(),
    baseRef: stringFlag(parsed, "base") ?? "HEAD",
    runChecks: !parsed.flags.has("no-run"),
    ...(outputPath === undefined ? {} : { outputPath }),
    ...(markdownPath === undefined ? {} : { markdownPath })
  };
  const headRef = stringFlag(parsed, "head");
  const configPath = stringFlag(parsed, "config");
  const receipt = await checkRepository({
    ...checkOptions,
    ...(headRef === undefined ? {} : { headRef }),
    ...(configPath === undefined ? {} : { configPath })
  });
  process.stdout.write(format === "json" ? `${JSON.stringify(receipt, null, 2)}\n` : format === "markdown" ? renderMarkdown(receipt) : renderConsole(receipt));
  return receipt.verdict.status === "PASS" ? 0 : 1;
}

main().then((code) => {
  process.exitCode = code;
}).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`DiffLedger error: ${message}\n`);
  process.exitCode = 2;
});
