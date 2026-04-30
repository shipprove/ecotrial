import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadConfig } from "../src/config/loadConfig.js";

describe("loadConfig", () => {
  it("loads a minimal localPath config with defaults", async () => {
    const dir = await mkdtemp(join(tmpdir(), "ecotrial-config-"));
    const configPath = join(dir, "ecotrial.yml");
    await writeFile(
      configPath,
      `candidate:
  packageName: "ecotrial"
  source: "auto-pack"
projects:
  - name: "fixture"
    localPath: "fixtures/downstreams/fixture"
    packageManager: "pnpm"
    override:
      strategy: "package-json-rewrite"
    install: "pnpm install --lockfile=false"
    commands:
      - name: "help"
        run: "pnpm exec ecotrial --help"
`
    );

    const config = await loadConfig(configPath);

    expect(config.candidate.packageRoot).toBe(".");
    expect(config.execution.installScripts).toBe(true);
    expect(config.projects[0]?.name).toBe("fixture");
  });

  it("rejects projects without repo or localPath", async () => {
    const dir = await mkdtemp(join(tmpdir(), "ecotrial-config-"));
    const configPath = join(dir, "ecotrial.yml");
    await writeFile(
      configPath,
      `candidate:
  packageName: "ecotrial"
  source: "auto-pack"
projects:
  - name: "fixture"
    packageManager: "pnpm"
    override:
      strategy: "package-json-rewrite"
    install: "pnpm install"
    commands:
      - name: "help"
        run: "pnpm exec ecotrial --help"
`
    );

    await expect(loadConfig(configPath)).rejects.toThrow("Exactly one of repo or localPath is required");
  });
});
