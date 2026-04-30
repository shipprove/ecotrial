export type ParsedArgs = {
  command: string;
  flags: Map<string, string | boolean>;
};

export function parseArgs(argv: string[]): ParsedArgs {
  const [command = "help", ...rest] = argv;
  const flags = new Map<string, string | boolean>();

  for (let index = 0; index < rest.length; index += 1) {
    const token = rest[index];
    if (!token.startsWith("--")) {
      continue;
    }

    const key = token.slice(2);
    const next = rest[index + 1];
    if (next && !next.startsWith("--")) {
      flags.set(key, next);
      index += 1;
    } else {
      flags.set(key, true);
    }
  }

  return { command, flags };
}

export function getStringFlag(flags: Map<string, string | boolean>, name: string, fallback: string): string {
  const value = flags.get(name);
  return typeof value === "string" ? value : fallback;
}
