import assert from "node:assert/strict";
import test from "node:test";
import { canonicalJson, sha256 } from "../src/canonical.js";
import { classifyPath } from "../src/classify.js";
import { assessRisk } from "../src/risk.js";
import type { ChangeSet } from "../src/types.js";

test("classifies high-signal repository paths", () => {
  assert.deepEqual(classifyPath(".github/workflows/release.yml"), ["configuration", "workflow"]);
  assert.deepEqual(classifyPath("db/migrations/2026_add_user.sql"), ["migration"]);
  assert.deepEqual(classifyPath("src/auth/session.ts"), ["security", "source"]);
  assert.deepEqual(classifyPath("SECURITY.md"), ["documentation"]);
  assert.deepEqual(classifyPath("package-lock.json"), ["configuration", "dependency"]);
  assert.deepEqual(classifyPath("src/user.test.ts"), ["test"]);
});

test("caps cumulative risk at 100 with stable reason codes", () => {
  const changeSet: ChangeSet = {
    base: { ref: "main", sha: "a".repeat(40) },
    target: { ref: "WORKTREE", digest: "b".repeat(64) },
    files: [
      { path: ".github/workflows/release.yml", status: "modified", additions: 1_600, deletions: 20, categories: ["workflow", "configuration"] },
      { path: "db/migrations/drop.sql", status: "added", additions: 10, deletions: 0, categories: ["migration"] },
      { path: "src/auth/session.ts", status: "deleted", additions: 0, deletions: 100, categories: ["source", "security"] },
      { path: "package-lock.json", status: "modified", additions: 10, deletions: 10, categories: ["dependency", "configuration"] }
    ],
    summary: { files: 4, additions: 1_620, deletions: 130, categories: ["configuration", "dependency", "migration", "security", "source", "workflow"] }
  };

  const risk = assessRisk(changeSet);

  assert.equal(risk.score, 100);
  assert.equal(risk.level, "critical");
  assert.deepEqual(risk.signals.map((item) => item.code), [
    "workflow_change",
    "migration_change",
    "security_sensitive_change",
    "dependency_change",
    "source_without_tests",
    "file_deletion",
    "very_large_change"
  ]);
});

test("canonical digest is independent of object key insertion order", () => {
  assert.equal(canonicalJson({ z: 1, a: { y: 2, x: 3 } }), '{"a":{"x":3,"y":2},"z":1}');
  assert.equal(sha256({ a: 1, b: 2 }), sha256({ b: 2, a: 1 }));
});
