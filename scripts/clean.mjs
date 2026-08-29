import { rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const allowedTargets = new Set(["dist", ".test-dist"]);
const requestedTargets = process.argv.slice(2);
const targets = requestedTargets.length === 0 ? [...allowedTargets] : requestedTargets;

for (const target of targets) {
  if (!allowedTargets.has(target)) {
    throw new Error(`Refusing to clean unknown target: ${target}`);
  }
  rmSync(path.join(projectRoot, target), { recursive: true, force: true });
}
