import { execFile } from "node:child_process";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";
import { runEcoTrial } from "../src/core/runEcoTrial.js";
import type { EcoTrialConfig } from "../src/config/schema.js";

const execFileAsync = promisify(execFile);

describe("runEcoTrial", () => {
  it("injects a candidate tarball and runs a local downstream", async () => {
    const candidateDir = await mkdtemp(join(tmpdir(), "ecotrial-candidate-package-"));
    await writeFile(
      join(candidateDir, "package.json"),
      JSON.stringify({
        name: "ecotrial",
        version: "0.0.1",
        type: "module",
        main: "index.js",
        files: ["index.js"]
      })
    );
    await writeFile(join(candidateDir, "index.js"), "export const marker = 'candidate';\n");
    const { stdout } = await execFileAsync("npm", ["pack", "--json"], { cwd: candidateDir });
    const filename = (JSON.parse(stdout) as Array<{ filename: string }>)[0]?.filename;
    if (!filename) {
      throw new Error("npm pack did not produce a fixture tarball");
    }

    const report = await runEcoTrial(config(join(candidateDir, filename)), {
      configPath: "test",
      cwd: process.cwd()
    });

    expect(report.status).toBe("passed");
    expect(report.summary.passed).toBe(1);
  }, 20_000);
});

function config(source: string): EcoTrialConfig {
  return {
    candidate: { packageName: "ecotrial", source, packageRoot: "." },
    execution: {
      timeoutMinutes: 1,
      totalTimeoutMinutes: 2,
      keepWorkdir: false,
      installScripts: false,
      maxProjects: 5,
      maxOutputBytes: 200 * 1024,
      maxJsonReportBytes: 256 * 1024,
      maxLocalWorkspaceBytes: 50 * 1024 * 1024
    },
    projects: [
      {
        name: "downstream-pass",
        localPath: "tests/fixtures/downstream-pass",
        packageManager: "npm",
        override: { strategy: "package-json-rewrite" },
        install: "npm install --package-lock=false",
        commands: [
          {
            name: "import",
            run: "node -e \"import('ecotrial').then((m) => console.log(m.marker))\""
          }
        ]
      }
    ]
  };
}
