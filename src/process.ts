import { spawn, type ChildProcess } from "node:child_process";

export interface ProcessResult {
  exitCode: number | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
  error?: string;
  outputTruncated: boolean;
  durationMs: number;
}

function appendBounded(current: Buffer, chunk: Buffer, remaining: number): { value: Buffer; captured: number; truncated: boolean } {
  if (chunk.length <= remaining) return { value: Buffer.concat([current, chunk]), captured: chunk.length, truncated: false };
  return { value: Buffer.concat([current, chunk.subarray(0, remaining)]), captured: remaining, truncated: true };
}

function terminateProcessTree(child: ChildProcess, force: boolean): void {
  if (child.pid === undefined) return;
  if (process.platform === "win32") {
    const killer = spawn("taskkill", ["/pid", String(child.pid), "/t", "/f"], {
      shell: false,
      stdio: "ignore"
    });
    killer.unref();
    return;
  }
  try {
    process.kill(-child.pid, force ? "SIGKILL" : "SIGTERM");
  } catch {
    child.kill(force ? "SIGKILL" : "SIGTERM");
  }
}

export function runProcess(
  executable: string,
  args: string[],
  options: { cwd: string; timeoutMs: number; maxOutputBytes: number }
): Promise<ProcessResult> {
  return new Promise((resolve) => {
    const started = Date.now();
    let stdout: Buffer = Buffer.alloc(0);
    let stderr: Buffer = Buffer.alloc(0);
    let capturedBytes = 0;
    let truncated = false;
    let timedOut = false;
    let settled = false;
    let forceTimer: NodeJS.Timeout | undefined;
    let spawnError: string | undefined;
    const child = spawn(executable, args, {
      cwd: options.cwd,
      detached: process.platform !== "win32",
      shell: false,
      stdio: ["ignore", "pipe", "pipe"]
    });

    child.stdout.on("data", (chunk: Buffer) => {
      const next = appendBounded(stdout, chunk, Math.max(0, options.maxOutputBytes - capturedBytes));
      stdout = next.value;
      capturedBytes += next.captured;
      truncated ||= next.truncated;
    });
    child.stderr.on("data", (chunk: Buffer) => {
      const next = appendBounded(stderr, chunk, Math.max(0, options.maxOutputBytes - capturedBytes));
      stderr = next.value;
      capturedBytes += next.captured;
      truncated ||= next.truncated;
    });
    child.on("error", (error) => {
      spawnError = error.message;
    });

    const timer = setTimeout(() => {
      timedOut = true;
      terminateProcessTree(child, false);
      forceTimer = setTimeout(() => terminateProcessTree(child, true), 250);
      forceTimer.unref();
    }, options.timeoutMs);

    child.on("close", (exitCode) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (forceTimer !== undefined) clearTimeout(forceTimer);
      const result: ProcessResult = {
        exitCode,
        stdout: stdout.toString("utf8"),
        stderr: stderr.toString("utf8"),
        timedOut,
        outputTruncated: truncated,
        durationMs: Date.now() - started
      };
      if (spawnError !== undefined) result.error = spawnError;
      resolve(result);
    });
  });
}
