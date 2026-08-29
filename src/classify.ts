import path from "node:path";
import type { ChangeCategory } from "./types.js";

const SOURCE_EXTENSIONS = new Set([
  ".c", ".cc", ".cpp", ".cs", ".go", ".java", ".js", ".jsx", ".kt",
  ".php", ".py", ".rb", ".rs", ".swift", ".ts", ".tsx", ".vue"
]);
const DEPENDENCY_FILES = new Set([
  "bun.lock", "bun.lockb", "cargo.lock", "cargo.toml", "composer.json",
  "composer.lock", "gemfile", "gemfile.lock", "go.mod", "go.sum",
  "package-lock.json", "package.json", "pnpm-lock.yaml", "poetry.lock",
  "pyproject.toml", "requirements.txt", "uv.lock", "yarn.lock"
]);

export function classifyPath(filePath: string): ChangeCategory[] {
  const normalized = filePath.replaceAll("\\", "/").toLowerCase();
  const basename = path.posix.basename(normalized);
  const categories = new Set<ChangeCategory>();

  if (normalized.startsWith("docs/") || /(^|\/)readme(?:\.|$)/.test(normalized) || [".md", ".mdx", ".rst"].includes(path.posix.extname(normalized))) {
    categories.add("documentation");
  }
  const isTest = /(^|\/)(__tests__|tests?|specs?)(\/|$)/.test(normalized) || /\.(test|spec)\.[^.]+$/.test(normalized);
  if (isTest) categories.add("test");
  if (SOURCE_EXTENSIONS.has(path.posix.extname(normalized)) && !isTest) categories.add("source");
  if (DEPENDENCY_FILES.has(basename)) categories.add("dependency");
  if (normalized.startsWith(".github/workflows/") && /\.ya?ml$/.test(normalized)) categories.add("workflow");
  if (/(^|\/)(migrations?|schema-changes?)(\/|$)/.test(normalized)) categories.add("migration");
  if (!categories.has("documentation") && /(^|[._\/-])(auth|acl|crypto|permission|security|secret)([._\/-]|$)/.test(normalized)) categories.add("security");
  if (
    normalized.startsWith(".github/") ||
    /^\.[^/]+rc(?:\.|$)/.test(basename) ||
    /(^|\/)(tsconfig|eslint|prettier|vite|webpack|dockerfile)/.test(normalized) ||
    [".json", ".toml", ".yaml", ".yml"].includes(path.posix.extname(normalized))
  ) categories.add("configuration");

  return [...categories].sort();
}
