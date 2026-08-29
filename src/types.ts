export type ChangeCategory =
  | "source"
  | "test"
  | "documentation"
  | "dependency"
  | "migration"
  | "workflow"
  | "security"
  | "configuration";

export type ChangeStatus = "added" | "modified" | "deleted" | "renamed";

export interface ChangedFile {
  path: string;
  previousPath?: string;
  status: ChangeStatus;
  additions: number;
  deletions: number;
  categories: ChangeCategory[];
}

export interface ChangeSet {
  base: { ref: string; sha: string; requestedRef?: string };
  target: { ref: string; digest: string };
  files: ChangedFile[];
  summary: {
    files: number;
    additions: number;
    deletions: number;
    categories: ChangeCategory[];
  };
}

export interface EvidenceCheck {
  id: string;
  command: string;
  args: string[];
  when: Array<ChangeCategory | "always">;
  required: boolean;
  timeoutMs: number;
}

export interface Policy {
  schemaVersion: 1;
  maxRiskScore: number;
  maxOutputBytes: number;
  checks: EvidenceCheck[];
}

export interface RiskSignal {
  code: string;
  score: number;
  severity: "low" | "medium" | "high";
  message: string;
  files: string[];
}

export interface RiskAssessment {
  score: number;
  level: "low" | "medium" | "high" | "critical";
  signals: RiskSignal[];
}

export interface EvidenceResult {
  checkId: string;
  required: boolean;
  status: "passed" | "failed" | "timed_out" | "error" | "skipped";
  command: string[];
  durationMs: number;
  exitCode: number | null;
  stdout: string;
  stderr: string;
  outputTruncated: boolean;
}

export interface ReceiptBody {
  schemaVersion: 1;
  tool: { name: "diffledger"; version: string };
  createdAt: string;
  changeSet: ChangeSet;
  policy: {
    path: string;
    digest: string;
    maxRiskScore: number;
  };
  risk: RiskAssessment;
  evidenceResults: EvidenceResult[];
  verdict: {
    status: "PASS" | "FAIL";
    reasons: string[];
  };
}

export interface Receipt extends ReceiptBody {
  integrity: {
    algorithm: "sha256";
    digest: string;
  };
}
