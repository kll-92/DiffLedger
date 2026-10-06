import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { join } from "node:path";

const testDirectory = ".test-dist/test";
const testFiles = readdirSync(testDirectory)
  .filter((file) => file.endsWith(".test.js"))
  .sort()
  .map((file) => join(testDirectory, file));

if (testFiles.length === 0) {
  console.error(`No compiled test files found in ${testDirectory}.`);
  process.exitCode = 1;
} else {
  const result = spawnSync(process.execPath, ["--test", ...testFiles], {
    stdio: "inherit",
  });

  if (result.error) {
    console.error("Could not start the Node.js test runner:", result.error);
    process.exitCode = 1;
  } else {
    process.exitCode = result.status ?? 1;
  }
}
