import { describe, expect, it } from "vitest";
import { enforceJsonReportSize, renderTerminalReport } from "../src/report/render.js";
import type { JsonReport } from "../src/report/types.js";

describe("report rendering", () => {
  it("renders terminal report summary", () => {
    expect(renderTerminalReport(report())).toContain("Downstream Compatibility Report");
  });

  it("compacts command output when JSON report exceeds max size", () => {
    const compacted = enforceJsonReportSize(report("x".repeat(10_000)), 1_000);

    expect(compacted.findings.some((finding) => finding.code === "OUTPUT_TRUNCATED")).toBe(true);
  });
});

function report(stdout = ""): JsonReport {
  return {
    schemaVersion: "1.0",
    tool: "ecotrial",
    toolVersion: "0.1.0",
    status: "passed",
    candidate: { packageName: "ecotrial", source: "auto-pack" },
    summary: { projects: 1, passed: 1, failed: 0 },
    projects: [
      {
        name: "fixture",
        status: "passed",
        durationMs: 1,
        steps: [{ name: "command", status: "passed", durationMs: 1, stdout }]
      }
    ],
    findings: []
  };
}
