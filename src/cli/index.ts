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
      console.log(await initCommand(configPath));
      return 0;
    }
    if (command === "doctor") {
      console.log(await doctorCommand(configPath));
      return 0;
    }
    if (command === "list") {
      console.log(await listCommand(configPath));
      return 0;
    }
    if (command === "run") {
      console.log(await runCommand(configPath));
      return 0;
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

main(process.argv.slice(2)).then((code) => {
  process.exitCode = code;
});
