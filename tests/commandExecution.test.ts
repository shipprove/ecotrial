import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { runShellCommand } from "../src/commands/runShellCommand.js";
import { sanitizeEnv } from "../src/commands/sanitizeEnv.js";
import { maskSecrets } from "../src/utils/maskSecrets.js";

describe("sanitizeEnv", () => {
  it("drops token-like variables", () => {
    const env = sanitizeEnv({
      PATH: "/bin",
      GITHUB_TOKEN: "secret",
      CUSTOM_SECRET: "secret",
      npm_config_cache: "/tmp/cache"
    });

    expect(env.PATH).toBe("/bin");
    expect(env.npm_config_cache).toBe("/tmp/cache");
    expect(env.GITHUB_TOKEN).toBeUndefined();
    expect(env.CUSTOM_SECRET).toBeUndefined();
  });
});

describe("maskSecrets", () => {
  it("redacts common token patterns and denylisted env values", () => {
    const masked = maskSecrets(
      "Authorization: Bearer abcdefghijklmnopqrstuvwxyz0123456789\nvalue=topsecret",
      { API_TOKEN: "topsecret" }
    );

    expect(masked).not.toContain("topsecret");
    expect(masked).toContain("[REDACTED]");
  });
});

describe("runShellCommand", () => {
  it("runs a shell command with bounded output", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "ecotrial-command-"));
    const result = await runShellCommand("node -e \"console.log('1234567890')\"", {
      cwd,
      timeoutMs: 5_000,
      maxOutputBytes: 5
    });

    expect(result.status).toBe("passed");
    expect(result.truncated).toBe(true);
    expect(result.stdout.length).toBeLessThanOrEqual(5);
  });

  it("classifies timeouts", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "ecotrial-command-"));
    const result = await runShellCommand("node -e \"setTimeout(() => {}, 1000)\"", {
      cwd,
      timeoutMs: 10,
      maxOutputBytes: 1024
    });

    expect(result.status).toBe("failed");
    expect(result.timedOut).toBe(true);
  });
});
