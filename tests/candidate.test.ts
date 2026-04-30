import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { copyCandidateIntoProject, resolveCandidate } from "../src/candidate/resolveCandidate.js";
import type { EcoTrialConfig } from "../src/config/schema.js";

describe("resolveCandidate", () => {
  it("resolves a local tgz source", async () => {
    const dir = await mkdtemp(join(tmpdir(), "ecotrial-candidate-"));
    const tarball = join(dir, "ecotrial-0.1.0.tgz");
    await writeFile(tarball, "fake tarball");

    const candidate = await resolveCandidate(configWithSource(tarball), dir);

    expect(candidate.tarballPath).toBe(tarball);
  });

  it("packs a candidate package from packageRoot", async () => {
    const dir = await mkdtemp(join(tmpdir(), "ecotrial-pack-"));
    await writeFile(
      join(dir, "package.json"),
      JSON.stringify({
        name: "fixture-package",
        version: "0.0.1",
        files: ["index.js"]
      })
    );
    await writeFile(join(dir, "index.js"), "export const value = 1;\n");

    const candidate = await resolveCandidate(
      {
        ...configWithSource("auto-pack"),
        candidate: { packageName: "fixture-package", source: "auto-pack", packageRoot: "." }
      },
      dir
    );

    expect(candidate.tarballPath.endsWith("fixture-package-0.0.1.tgz")).toBe(true);
  });

  it("copies the tarball into the prepared project", async () => {
    const dir = await mkdtemp(join(tmpdir(), "ecotrial-candidate-"));
    const tarball = join(dir, "ecotrial-0.1.0.tgz");
    const projectRoot = join(dir, "project");
    await writeFile(tarball, "fake tarball");

    const replacement = await copyCandidateIntoProject({ packageName: "ecotrial", tarballPath: tarball }, projectRoot);

    expect(replacement).toBe("file:.ecotrial/candidate.tgz");
  });
});

function configWithSource(source: string): EcoTrialConfig {
  return {
    candidate: { packageName: "ecotrial", source, packageRoot: "." },
    execution: {
      timeoutMinutes: 15,
      totalTimeoutMinutes: 20,
      keepWorkdir: false,
      installScripts: true,
      maxProjects: 5,
      maxOutputBytes: 200 * 1024,
      maxJsonReportBytes: 256 * 1024,
      maxLocalWorkspaceBytes: 50 * 1024 * 1024
    },
    projects: []
  };
}
