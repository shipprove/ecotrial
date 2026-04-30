import { lstat, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, isAbsolute, join, relative } from "node:path";

const EXCLUDED_NAMES = new Set([".git", "node_modules", "dist", ".ecotrial", ".pnpm-store"]);

export async function ensureDir(path: string): Promise<void> {
  await mkdir(path, { recursive: true });
}

export function isInside(parent: string, child: string): boolean {
  const rel = relative(parent, child);
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
}

export async function readJsonFile<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(path, "utf8")) as T;
}

export async function writeJsonFile(path: string, value: unknown): Promise<void> {
  await ensureDir(dirname(path));
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`);
}

export async function copyLocalProject(source: string, destination: string, maxBytes: number): Promise<void> {
  await ensureDir(destination);
  let copiedBytes = 0;

  async function copyEntry(from: string, to: string): Promise<void> {
    const entryStat = await lstat(from);
    if (entryStat.isSymbolicLink()) {
      throw new Error(`Local project contains a symlink, which is not allowed: ${from}`);
    }
    if (EXCLUDED_NAMES.has(basename(from))) {
      return;
    }
    if (entryStat.isDirectory()) {
      await ensureDir(to);
      const entries = await readdir(from);
      for (const entry of entries) {
        await copyEntry(join(from, entry), join(to, entry));
      }
      return;
    }
    if (!entryStat.isFile()) {
      return;
    }

    copiedBytes += entryStat.size;
    if (copiedBytes > maxBytes) {
      throw new Error(`Local project exceeds max copy size of ${maxBytes} bytes`);
    }
    const content = await readFile(from);
    await writeFile(to, content);
  }

  await copyEntry(source, destination);
}
