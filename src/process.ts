import { spawn } from "node:child_process";

export interface ProcessResult {
  exitCode: number | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
  error?: string;
  outputTruncated: boolean;
  durationMs: number;
}

function appendBounded(current: Buffer, chunk: Buffer, limit: number): { value: Buffer; truncated: boolean } {
  const remaining = Math.max(0, limit - current.length);
  if (chunk.length <= remaining) return { value: Buffer.concat([current, chunk]), truncated: false };
  return { value: Buffer.concat([current, chunk.subarray(0, remaining)]), truncated: true };
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
    let truncated = false;
    let timedOut = false;
    let settled = false;
    let spawnError: string | undefined;
    const child = spawn(executable, args, {
      cwd: options.cwd,
      shell: false,
      stdio: ["ignore", "pipe", "pipe"]
    });

    child.stdout.on("data", (chunk: Buffer) => {
      const next = appendBounded(stdout, chunk, options.maxOutputBytes);
      stdout = next.value;
      truncated ||= next.truncated;
    });
    child.stderr.on("data", (chunk: Buffer) => {
      const next = appendBounded(stderr, chunk, options.maxOutputBytes);
      stderr = next.value;
      truncated ||= next.truncated;
    });
    child.on("error", (error) => {
      spawnError = error.message;
    });

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
      setTimeout(() => child.kill("SIGKILL"), 250).unref();
    }, options.timeoutMs);

    child.on("close", (exitCode) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
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
