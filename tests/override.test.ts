import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { applyPackageJsonRewrite } from "../src/override/packageJsonRewrite.js";

describe("applyPackageJsonRewrite", () => {
  it("replaces an existing dependency", async () => {
    const dir = await mkdtemp(join(tmpdir(), "ecotrial-override-"));
    await writeFile(
      join(dir, "package.json"),
      JSON.stringify({ devDependencies: { ecotrial: "0.0.0" } })
    );

    await applyPackageJsonRewrite(dir, "ecotrial", "file:.ecotrial/candidate.tgz");

    const rewritten = JSON.parse(await readFile(join(dir, "package.json"), "utf8")) as {
      devDependencies: Record<string, string>;
    };
    expect(rewritten.devDependencies.ecotrial).toBe("file:.ecotrial/candidate.tgz");
  });

  it("rejects downstreams that do not already depend on the candidate", async () => {
    const dir = await mkdtemp(join(tmpdir(), "ecotrial-override-"));
    await writeFile(join(dir, "package.json"), JSON.stringify({ devDependencies: {} }));

    await expect(applyPackageJsonRewrite(dir, "ecotrial", "file:.ecotrial/candidate.tgz")).rejects.toThrow(
      "OVERRIDE_TARGET_MISSING"
    );
  });
});
