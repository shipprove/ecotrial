import { realpath } from "node:fs/promises";
import { join, resolve } from "node:path";
import type { EcoTrialProjectConfig } from "../config/schema.js";
import { copyLocalProject, ensureDir, isInside } from "../utils/fs.js";

export type PreparedProject = {
  name: string;
  root: string;
};

export async function prepareLocalProject(
  project: EcoTrialProjectConfig,
  repoRoot: string,
  workdirRoot: string,
  maxBytes: number
): Promise<PreparedProject> {
  if (!project.localPath) {
    throw new Error(`${project.name}: localPath is required for local project preparation`);
  }

  const root = await realpath(repoRoot);
  const source = await realpath(resolve(root, project.localPath));
  if (!isInside(root, source)) {
    throw new Error(`${project.name}: localPath must be inside the repository root`);
  }

  const destination = join(workdirRoot, project.name);
  await ensureDir(workdirRoot);
  await copyLocalProject(source, destination, maxBytes);
  return { name: project.name, root: destination };
}
