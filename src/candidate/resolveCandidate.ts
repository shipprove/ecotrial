import { execFile } from "node:child_process";
import { copyFile, stat } from "node:fs/promises";
import { isAbsolute, join, resolve } from "node:path";
import { promisify } from "node:util";
import type { EcoTrialConfig } from "../config/schema.js";
import { ensureDir } from "../utils/fs.js";

const execFileAsync = promisify(execFile);

export type ResolvedCandidate = {
  packageName: string;
  tarballPath: string;
};

type NpmPackEntry = {
  filename: string;
};

export async function resolveCandidate(config: EcoTrialConfig, cwd: string = process.cwd()): Promise<ResolvedCandidate> {
  const source = config.candidate.source;
  if (source === "auto-pack") {
    const packageRoot = resolve(cwd, config.candidate.packageRoot);
    const { stdout } = await execFileAsync("npm", ["pack", "--json"], {
      cwd: packageRoot,
      maxBuffer: 1024 * 1024
    });
    const entries = JSON.parse(stdout) as NpmPackEntry[];
    const filename = entries[0]?.filename;
    if (!filename) {
      throw new Error("npm pack did not return a tarball filename");
    }
    return {
      packageName: config.candidate.packageName,
      tarballPath: join(packageRoot, filename)
    };
  }

  if (!source.endsWith(".tgz")) {
    throw new Error(`Unsupported candidate source: ${source}`);
  }

  const tarballPath = isAbsolute(source) ? source : resolve(cwd, source);
  await assertFile(tarballPath);
  return {
    packageName: config.candidate.packageName,
    tarballPath
  };
}

export async function copyCandidateIntoProject(candidate: ResolvedCandidate, projectRoot: string): Promise<string> {
  const candidateDir = join(projectRoot, ".ecotrial");
  const target = join(candidateDir, "candidate.tgz");
  await ensureDir(candidateDir);
  await copyFile(candidate.tarballPath, target);
  return "file:.ecotrial/candidate.tgz";
}

async function assertFile(path: string): Promise<void> {
  const fileStat = await stat(path);
  if (!fileStat.isFile()) {
    throw new Error(`Candidate source is not a file: ${path}`);
  }
}
