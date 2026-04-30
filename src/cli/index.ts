#!/usr/bin/env node
import { ConfigError } from "../config/loadConfig.js";
import { getStringFlag, parseArgs } from "./args.js";
import { doctorCommand, helpText, initCommand, listCommand, runCommand } from "./commands.js";

async function main(argv: string[]): Promise<number> {
  const { command, flags } = parseArgs(argv);
  const configPath = getStringFlag(flags, "config", "ecotrial.yml");

  try {
    if (command === "help" || command === "--help" || command === "-h") {
      console.log(helpText());
      return 0;
    }
    if (command === "init") {
      return printResult(await initCommand(configPath));
    }
    if (command === "doctor") {
      return printResult(await doctorCommand(configPath));
    }
    if (command === "list") {
      return printResult(await listCommand(configPath));
    }
    if (command === "run") {
      const jsonPath = typeof flags.get("json") === "string" ? String(flags.get("json")) : undefined;
      return printResult(await runCommand(configPath, jsonPath));
    }

    console.error(`Unknown command: ${command}`);
    console.error(helpText());
    return 2;
  } catch (error) {
    if (error instanceof ConfigError) {
      console.error(error.message);
      return 2;
    }
    console.error(error instanceof Error ? error.message : String(error));
    return 1;
  }
}

function printResult(result: { output: string; exitCode: number }): number {
  if (result.output) {
    console.log(result.output);
  }
  return result.exitCode;
}

main(process.argv.slice(2)).then((code) => {
  process.exitCode = code;
});
