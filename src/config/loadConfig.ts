import { readFile } from "node:fs/promises";
import { parse } from "yaml";
import { ZodError } from "zod";
import { ecotrialConfigSchema, type EcoTrialConfig } from "./schema.js";

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}

export async function loadConfig(path: string): Promise<EcoTrialConfig> {
  let raw: string;
  try {
    raw = await readFile(path, "utf8");
  } catch (error) {
    throw new ConfigError(`Could not read config at ${path}: ${formatUnknownError(error)}`);
  }

  let parsed: unknown;
  try {
    parsed = parse(raw);
  } catch (error) {
    throw new ConfigError(`Invalid YAML in ${path}: ${formatUnknownError(error)}`);
  }

  try {
    const config = ecotrialConfigSchema.parse(parsed);
    if (config.projects.length > config.execution.maxProjects) {
      throw new ConfigError(
        `Config defines ${config.projects.length} projects, exceeding execution.maxProjects (${config.execution.maxProjects})`
      );
    }
    return config;
  } catch (error) {
    if (error instanceof ConfigError) {
      throw error;
    }
    if (error instanceof ZodError) {
      const issues = error.issues.map((issue) => `${issue.path.join(".") || "<root>"}: ${issue.message}`);
      throw new ConfigError(`Invalid EcoTrial config:\n${issues.join("\n")}`);
    }
    throw error;
  }
}

function formatUnknownError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
