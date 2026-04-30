import { describe, expect, it } from "vitest";
import { parseArgs } from "../src/cli/args.js";
import { helpText } from "../src/cli/commands.js";

describe("cli", () => {
  it("parses a command and config flag", () => {
    const parsed = parseArgs(["doctor", "--config", "custom.yml"]);

    expect(parsed.command).toBe("doctor");
    expect(parsed.flags.get("config")).toBe("custom.yml");
  });

  it("renders help text", () => {
    expect(helpText()).toContain("ecotrial run");
  });
});
