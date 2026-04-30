import { join } from "node:path";
import { readJsonFile, writeJsonFile } from "../utils/fs.js";

type PackageJson = {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
};

const DEPENDENCY_FIELDS = ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"] as const;

export async function applyPackageJsonRewrite(
  projectRoot: string,
  packageName: string,
  replacement: string
): Promise<void> {
  const packageJsonPath = join(projectRoot, "package.json");
  const packageJson = await readJsonFile<PackageJson>(packageJsonPath);
  const field = DEPENDENCY_FIELDS.find((key) => Boolean(packageJson[key]?.[packageName]));

  if (!field) {
    throw new Error(`OVERRIDE_TARGET_MISSING: ${packageName} was not found in downstream dependencies`);
  }

  packageJson[field] = {
    ...packageJson[field],
    [packageName]: replacement
  };

  await writeJsonFile(packageJsonPath, packageJson);
}
