import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { classifyPath } from "./classify.js";
import type { ChangedFile, ChangeSet, ChangeStatus } from "./types.js";

function runGit(cwd: string, args: string[]): Buffer {
  try {
    return execFileSync("git", args, { cwd, maxBuffer: 20 * 1024 * 1024 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Git command failed: git ${args.join(" ")}\n${message}`);
  }
}

function gitText(cwd: string, args: string[]): string {
  return runGit(cwd, args).toString("utf8").trim();
}

function parseNameStatus(output: Buffer): ChangedFile[] {
  const parts = output.toString("utf8").split("\0");
  const files: ChangedFile[] = [];
  let index = 0;
  while (index < parts.length) {
    const token = parts[index++];
    if (!token) continue;
    const code = token[0];
    let previousPath: string | undefined;
    let filePath = parts[index++] ?? "";
    if (code === "R" || code === "C") {
      previousPath = filePath;
      filePath = parts[index++] ?? "";
    }
    if (!filePath) continue;
    const status: ChangeStatus = code === "A" ? "added" : code === "D" ? "deleted" : code === "R" || code === "C" ? "renamed" : "modified";
    const file: ChangedFile = { path: filePath, status, additions: 0, deletions: 0, categories: classifyPath(filePath) };
    if (previousPath !== undefined) file.previousPath = previousPath;
    files.push(file);
  }
  return files;
}

function parseNumstat(output: Buffer): Map<string, { additions: number; deletions: number }> {
  const parts = output.toString("utf8").split("\0");
  const stats = new Map<string, { additions: number; deletions: number }>();
  let index = 0;
  while (index < parts.length) {
    const token = parts[index++];
    if (!token) continue;
    const [addedRaw, deletedRaw, inlinePath] = token.split("\t");
    let filePath = inlinePath ?? "";
    if (!filePath) {
      index += 1;
      filePath = parts[index++] ?? "";
    }
    if (!filePath) continue;
    stats.set(filePath, {
      additions: addedRaw === "-" ? 0 : Number(addedRaw),
      deletions: deletedRaw === "-" ? 0 : Number(deletedRaw)
    });
  }
  return stats;
}

function countLines(filePath: string): number {
  if (!existsSync(filePath)) return 0;
  const content = readFileSync(filePath);
  if (content.includes(0)) return 0;
  const text = content.toString("utf8");
  return text.length === 0 ? 0 : text.split("\n").length;
}

function worktreeDigest(root: string, files: ChangedFile[]): string {
  const hash = createHash("sha256");
  for (const file of files) {
    hash.update(`${file.status}\0${file.path}\0`);
    const absolute = path.join(root, file.path);
    if (file.status !== "deleted" && existsSync(absolute)) hash.update(readFileSync(absolute));
    hash.update("\0");
  }
  return hash.digest("hex");
}

export function inspectChangeSet(cwd: string, baseRef: string, headRef?: string): { root: string; changeSet: ChangeSet } {
  const root = gitText(cwd, ["rev-parse", "--show-toplevel"]);
  const baseSha = gitText(root, ["rev-parse", `${baseRef}^{commit}`]);
  const committedTarget = headRef !== undefined;
  const targetSha = committedTarget ? gitText(root, ["rev-parse", `${headRef}^{commit}`]) : undefined;
  const diffBase = committedTarget ? gitText(root, ["merge-base", baseSha, targetSha!]) : baseSha;
  const range = committedTarget ? [diffBase, targetSha!] : [diffBase];
  const files = parseNameStatus(runGit(root, ["diff", "--name-status", "-z", "--find-renames", ...range, "--"]));
  const stats = parseNumstat(runGit(root, ["diff", "--numstat", "-z", "--find-renames", ...range, "--"]));

  for (const file of files) {
    const stat = stats.get(file.path);
    if (stat) {
      file.additions = stat.additions;
      file.deletions = stat.deletions;
    }
  }

  if (!committedTarget) {
    const untracked = runGit(root, ["ls-files", "--others", "--exclude-standard", "-z"])
      .toString("utf8").split("\0").filter(Boolean);
    const known = new Set(files.map((file) => file.path));
    for (const filePath of untracked) {
      if (known.has(filePath)) continue;
      files.push({
        path: filePath,
        status: "added",
        additions: countLines(path.join(root, filePath)),
        deletions: 0,
        categories: classifyPath(filePath)
      });
    }
  }

  files.sort((left, right) => left.path.localeCompare(right.path));
  const categories = [...new Set(files.flatMap((file) => file.categories))].sort();
  return {
    root,
    changeSet: {
      base: { ref: baseRef, sha: baseSha },
      target: {
        ref: headRef ?? "WORKTREE",
        digest: targetSha ?? worktreeDigest(root, files)
      },
      files,
      summary: {
        files: files.length,
        additions: files.reduce((sum, file) => sum + file.additions, 0),
        deletions: files.reduce((sum, file) => sum + file.deletions, 0),
        categories
      }
    }
  };
}
