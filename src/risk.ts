import type { ChangeSet, RiskAssessment, RiskSignal } from "./types.js";

function signal(code: string, score: number, message: string, files: string[]): RiskSignal {
  return {
    code,
    score,
    severity: score >= 25 ? "high" : score >= 15 ? "medium" : "low",
    message,
    files
  };
}

export function assessRisk(changeSet: ChangeSet): RiskAssessment {
  const signals: RiskSignal[] = [];
  const withCategory = (category: string) => changeSet.files.filter((file) => file.categories.includes(category as never)).map((file) => file.path);
  const workflow = withCategory("workflow");
  const migration = withCategory("migration");
  const security = withCategory("security");
  const dependency = withCategory("dependency");
  const source = withCategory("source");
  const tests = withCategory("test");
  const deleted = changeSet.files.filter((file) => file.status === "deleted").map((file) => file.path);
  const churn = changeSet.summary.additions + changeSet.summary.deletions;

  if (workflow.length) signals.push(signal("workflow_change", 30, "CI workflow changes can alter permissions and the trusted build path.", workflow));
  if (migration.length) signals.push(signal("migration_change", 25, "Database migrations may be difficult to reverse.", migration));
  if (security.length) signals.push(signal("security_sensitive_change", 25, "Security-sensitive paths changed.", security));
  if (dependency.length) signals.push(signal("dependency_change", 15, "Dependency or lock files changed.", dependency));
  if (source.length && !tests.length) signals.push(signal("source_without_tests", 20, "Source changed without a corresponding test-file change.", source));
  if (deleted.length) signals.push(signal("file_deletion", 10, "Files were deleted and may remove behavior or safeguards.", deleted));
  if (changeSet.summary.deletions > 500 && changeSet.summary.deletions > changeSet.summary.additions * 2) {
    signals.push(signal("deletion_heavy_change", 20, `The Change Set removes ${changeSet.summary.deletions} lines while adding ${changeSet.summary.additions}.`, changeSet.files.filter((file) => file.deletions > file.additions).map((file) => file.path)));
  }
  if (churn > 1_500) signals.push(signal("very_large_change", 30, `The Change Set contains ${churn} changed lines.`, changeSet.files.map((file) => file.path)));
  else if (churn > 500) signals.push(signal("large_change", 15, `The Change Set contains ${churn} changed lines.`, changeSet.files.map((file) => file.path)));

  const score = Math.min(100, signals.reduce((sum, item) => sum + item.score, 0));
  const level = score >= 75 ? "critical" : score >= 50 ? "high" : score >= 25 ? "medium" : "low";
  return { score, level, signals };
}
