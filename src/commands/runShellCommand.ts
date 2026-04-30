import { spawn } from "node:child_process";
import { maskSecrets } from "../utils/maskSecrets.js";
import { sanitizeEnv } from "./sanitizeEnv.js";

export type ShellCommandResult = {
  status: "passed" | "failed";
  command: string;
  exitCode?: number;
  durationMs: number;
  stdout: string;
  stderr: string;
  timedOut: boolean;
  truncated: boolean;
};

export type ShellCommandOptions = {
  cwd: string;
  timeoutMs: number;
  maxOutputBytes: number;
};

export async function runShellCommand(command: string, options: ShellCommandOptions): Promise<ShellCommandResult> {
  const startedAt = Date.now();
  let stdout = "";
  let stderr = "";
  let truncated = false;
  let timedOut = false;

  const child = spawn(command, {
    cwd: options.cwd,
    env: sanitizeEnv(),
    shell: true,
    detached: process.platform !== "win32",
    stdio: ["ignore", "pipe", "pipe"]
  });

  const timeout = setTimeout(() => {
    timedOut = true;
    terminate(child.pid);
  }, options.timeoutMs);

  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data", (chunk: string) => {
    const next = appendBounded(stdout, chunk, options.maxOutputBytes);
    stdout = next.value;
    truncated = truncated || next.truncated;
  });
  child.stderr.on("data", (chunk: string) => {
    const next = appendBounded(stderr, chunk, options.maxOutputBytes);
    stderr = next.value;
    truncated = truncated || next.truncated;
  });

  const exitCode = await new Promise<number | undefined>((resolve) => {
    child.on("error", () => resolve(1));
    child.on("close", (code) => resolve(code ?? undefined));
  });
  clearTimeout(timeout);

  const maskedStdout = maskSecrets(stdout);
  const maskedStderr = maskSecrets(stderr);
  return {
    status: exitCode === 0 && !timedOut ? "passed" : "failed",
    command,
    exitCode,
    durationMs: Date.now() - startedAt,
    stdout: maskedStdout,
    stderr: maskedStderr,
    timedOut,
    truncated
  };
}

function appendBounded(current: string, chunk: string, maxBytes: number): { value: string; truncated: boolean } {
  const combined = current + chunk;
  const bytes = Buffer.byteLength(combined, "utf8");
  if (bytes <= maxBytes) {
    return { value: combined, truncated: false };
  }
  let value = combined;
  while (Buffer.byteLength(value, "utf8") > maxBytes) {
    value = value.slice(Math.max(1, value.length - maxBytes));
  }
  return { value, truncated: true };
}

function terminate(pid: number | undefined): void {
  if (!pid) {
    return;
  }
  try {
    if (process.platform === "win32") {
      process.kill(pid, "SIGTERM");
      return;
    }
    process.kill(-pid, "SIGTERM");
  } catch {
    try {
      process.kill(pid, "SIGTERM");
    } catch {
      // Process may have already exited.
    }
  }
}
