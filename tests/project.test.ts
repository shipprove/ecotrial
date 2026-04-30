import { mkdir, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { mkdtemp } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { prepareLocalProject } from "../src/project/prepareProject.js";
import type { EcoTrialProjectConfig } from "../src/config/schema.js";

describe("prepareLocalProject", () => {
  it("copies a local project while excluding dependency artifacts", async () => {
    const root = await mkdtemp(join(tmpdir(), "ecotrial-root-"));
    const source = join(root, "fixtures", "downstream");
    const workdir = join(root, "workdir");
    await mkdir(join(source, "node_modules"), { recursive: true });
    await writeFile(join(source, "package.json"), "{}");
    await writeFile(join(source, "node_modules", "ignored.txt"), "ignored");

    const prepared = await prepareLocalProject(project("fixtures/downstream"), root, workdir, 1024);

    expect(prepared.root).toBe(join(workdir, "fixture"));
  });

  it("rejects symlinks", async () => {
    const root = await mkdtemp(join(tmpdir(), "ecotrial-root-"));
    const source = join(root, "fixtures", "downstream");
    await mkdir(source, { recursive: true });
    await writeFile(join(root, "target.txt"), "secret");
    await symlink(join(root, "target.txt"), join(source, "link.txt"));

    await expect(prepareLocalProject(project("fixtures/downstream"), root, join(root, "workdir"), 1024)).rejects.toThrow(
      "symlink"
    );
  });

  it("enforces the workspace size cap", async () => {
    const root = await mkdtemp(join(tmpdir(), "ecotrial-root-"));
    const source = join(root, "fixtures", "downstream");
    await mkdir(source, { recursive: true });
    await writeFile(join(source, "large.txt"), "123456");

    await expect(prepareLocalProject(project("fixtures/downstream"), root, join(root, "workdir"), 3)).rejects.toThrow(
      "max copy size"
    );
  });

  it("rejects localPath outside the repository root", async () => {
    const root = await mkdtemp(join(tmpdir(), "ecotrial-root-"));
    const outside = await mkdtemp(join(tmpdir(), "ecotrial-outside-"));

    await expect(prepareLocalProject(project(outside), root, join(root, "workdir"), 1024)).rejects.toThrow(
      "inside the repository root"
    );
  });
});

function project(localPath: string): EcoTrialProjectConfig {
  return {
    name: "fixture",
    localPath,
    packageManager: "pnpm",
    override: { strategy: "package-json-rewrite" },
    install: "pnpm install",
    commands: [{ name: "help", run: "pnpm exec ecotrial --help" }]
  };
}
