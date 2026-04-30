import type { JsonReport } from "./types.js";

export function renderTerminalReport(report: JsonReport): string {
  const lines = [
    "Downstream Compatibility Report",
    "",
    `Candidate: ${report.candidate.packageName} from ${report.candidate.source}`,
    `Projects: ${report.summary.projects}`,
    `Passed: ${report.summary.passed}`,
    `Failed: ${report.summary.failed}`,
    "",
    "| Project | Result |",
    "|---|---|"
  ];

  for (const project of report.projects) {
    lines.push(`| ${project.name} | ${project.status} |`);
  }

  if (report.findings.length > 0) {
    lines.push("", "Findings:");
    for (const finding of report.findings) {
      lines.push(`- ${finding.project}: ${finding.code} - ${finding.message}`);
    }
  }

  return lines.join("\n");
}

export function enforceJsonReportSize(report: JsonReport, maxBytes: number): JsonReport {
  let json = JSON.stringify(report);
  if (Buffer.byteLength(json, "utf8") <= maxBytes) {
    return report;
  }

  const compact: JsonReport = {
    ...report,
    projects: report.projects.map((project) => ({
      ...project,
      steps: project.steps.map((step) => ({
        ...step,
        stdout: step.stdout ? "[TRUNCATED_REPORT]" : undefined,
        stderr: step.stderr ? "[TRUNCATED_REPORT]" : undefined,
        truncated: true
      }))
    })),
    findings: [
      ...report.findings,
      {
        project: "*",
        code: "OUTPUT_TRUNCATED",
        message: `JSON report exceeded ${maxBytes} bytes and command output was compacted`
      }
    ]
  };

  json = JSON.stringify(compact);
  if (Buffer.byteLength(json, "utf8") > maxBytes) {
    return {
      ...compact,
      projects: [],
      findings: compact.findings
    };
  }
  return compact;
}
