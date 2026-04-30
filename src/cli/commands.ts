import { writeFile } from "node:fs/promises";
import { loadConfig } from "../config/loadConfig.js";
import type { EcoTrialConfig } from "../config/schema.js";

export async function initCommand(path: string): Promise<string> {
  const template = `candidate:
  packageName: "ecotrial"
  source: "auto-pack"
  packageRoot: "."

execution:
  timeoutMinutes: 15
  totalTimeoutMinutes: 20
  keepWorkdir: false
  installScripts: true

projects:
  - name: "example-downstream"
    localPath: "fixtures/downstreams/example"
    packageManager: "pnpm"
    override:
      strategy: "package-json-rewrite"
    install: "pnpm install --lockfile=false"
    commands:
      - name: "doctor"
        run: "pnpm exec ecotrial doctor --config ecotrial.yml"
`;

  await writeFile(path, template, { flag: "wx" });
  return `Created ${path}`;
}

export async function doctorCommand(path: string): Promise<string> {
  const config = await loadConfig(path);
  const warnings = collectWarnings(config);
  const lines = [`EcoTrial config OK: ${path}`, `Projects: ${config.projects.length}`];
  if (warnings.length > 0) {
    lines.push("Warnings:", ...warnings.map((warning) => `- ${warning}`));
  }
  return lines.join("\n");
}

export async function listCommand(path: string): Promise<string> {
  const config = await loadConfig(path);
  return config.projects
    .map((project) => {
      const source = project.localPath ? `local:${project.localPath}` : `repo:${project.repo}`;
      return `${project.name}\t${project.packageManager}\t${source}`;
    })
    .join("\n");
}

export async function runCommand(path: string): Promise<string> {
  const config = await loadConfig(path);
  return [
    "EcoTrial run is not implemented yet.",
    `Config: ${path}`,
    `Candidate: ${config.candidate.packageName}`,
    `Projects: ${config.projects.length}`
  ].join("\n");
}

export function helpText(): string {
  return `EcoTrial

Usage:
  ecotrial init [--config ecotrial.yml]
  ecotrial doctor [--config ecotrial.yml]
  ecotrial list [--config ecotrial.yml]
  ecotrial run [--config ecotrial.yml]
`;
}

function collectWarnings(config: EcoTrialConfig): string[] {
  return config.projects.flatMap((project) => {
    if (project.localPath && project.ref) {
      return [`${project.name}: ref is ignored for localPath projects`];
    }
    return [];
  });
}
