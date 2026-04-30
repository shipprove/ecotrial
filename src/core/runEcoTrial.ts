import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { EcoTrialConfig, EcoTrialProjectConfig } from "../config/schema.js";
import { copyCandidateIntoProject, resolveCandidate } from "../candidate/resolveCandidate.js";
import { applyPackageJsonRewrite } from "../override/packageJsonRewrite.js";
import { prepareLocalProject } from "../project/prepareProject.js";
import { runShellCommand } from "../commands/runShellCommand.js";
import { findRepoRoot } from "../utils/repoRoot.js";
import { enforceJsonReportSize } from "../report/render.js";
import type { DiagnosticCode, Finding, JsonReport, ProjectResult, RunStep } from "../report/types.js";

const TOOL_VERSION = "0.1.0";

export type RunOptions = {
  configPath: string;
  jsonPath?: string;
  cwd?: string;
};

export async function runEcoTrial(config: EcoTrialConfig, options: RunOptions): Promise<JsonReport> {
  const cwd = options.cwd ?? process.cwd();
  const startedAt = Date.now();
  const repoRoot = await findRepoRoot(cwd);
  const candidate = await resolveCandidate(config, cwd);
  const workdirRoot = await mkdtemp(join(tmpdir(), "ecotrial-run-"));
  const findings: Finding[] = [];
  const projects: ProjectResult[] = [];

  try {
    for (const project of config.projects) {
      if (Date.now() - startedAt > config.execution.totalTimeoutMinutes * 60_000) {
        findings.push({
          project: project.name,
          code: "DOWNSTREAM_TIMEOUT",
          message: "Total run timeout exceeded before project started"
        });
        projects.push({ name: project.name, status: "failed", durationMs: 0, steps: [] });
        continue;
      }
      const result = await runProject(project, config, repoRoot, workdirRoot, candidate);
      projects.push(result.project);
      findings.push(...result.findings);
    }
  } finally {
    if (!config.execution.keepWorkdir) {
      await rm(workdirRoot, { recursive: true, force: true });
    } else {
      console.warn(`EcoTrial kept workdir at ${workdirRoot}; unredacted dependency files may remain on disk.`);
    }
  }

  const failed = projects.filter((project) => project.status === "failed").length;
  const report = enforceJsonReportSize(
    {
      schemaVersion: "1.0",
      tool: "ecotrial",
      toolVersion: TOOL_VERSION,
      status: failed > 0 ? "failed" : "passed",
      candidate: {
        packageName: candidate.packageName,
        source: config.candidate.source
      },
      summary: {
        projects: projects.length,
        passed: projects.length - failed,
        failed
      },
      projects,
      findings
    },
    config.execution.maxJsonReportBytes
  );

  if (options.jsonPath) {
    await writeFile(options.jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  }
  return report;
}

async function runProject(
  project: EcoTrialProjectConfig,
  config: EcoTrialConfig,
  repoRoot: string,
  workdirRoot: string,
  candidate: Awaited<ReturnType<typeof resolveCandidate>>
): Promise<{ project: ProjectResult; findings: Finding[] }> {
  const startedAt = Date.now();
  const steps: RunStep[] = [];
  const findings: Finding[] = [];

  try {
    if (!project.localPath) {
      throw new Error("Only localPath projects are supported in the dogfood MVP runner");
    }
    const prepared = await prepareLocalProject(
      project,
      repoRoot,
      workdirRoot,
      config.execution.maxLocalWorkspaceBytes
    );
    steps.push({ name: "prepare", status: "passed", durationMs: Date.now() - startedAt });

    const replacement = await copyCandidateIntoProject(candidate, prepared.root);
    await applyPackageJsonRewrite(prepared.root, candidate.packageName, replacement);
    steps.push({ name: "override", status: "passed", durationMs: Date.now() - startedAt });

    const installCommand = withInstallScriptPolicy(project.install, project.packageManager, config.execution.installScripts);
    const install = await runShellCommand(installCommand, {
      cwd: prepared.root,
      timeoutMs: (project.timeoutMinutes ?? config.execution.timeoutMinutes) * 60_000,
      maxOutputBytes: config.execution.maxOutputBytes
    });
    const installStep = commandResultToStep("install", install);
    steps.push(installStep);
    collectCommandFindings(project.name, installStep, findings, "DOWNSTREAM_INSTALL_FAILED");
    if (install.status === "failed") {
      return finishProject(project.name, startedAt, steps, findings);
    }

    for (const command of project.commands) {
      const result = await runShellCommand(command.run, {
        cwd: prepared.root,
        timeoutMs: (project.timeoutMinutes ?? config.execution.timeoutMinutes) * 60_000,
        maxOutputBytes: config.execution.maxOutputBytes
      });
      const step = commandResultToStep("command", result, command.name);
      steps.push(step);
      collectCommandFindings(project.name, step, findings, "DOWNSTREAM_COMMAND_FAILED");
      if (result.status === "failed") {
        break;
      }
    }
  } catch (error) {
    const code = classifyError(error);
    steps.push({
      name: code === "OVERRIDE_TARGET_MISSING" ? "override" : "prepare",
      status: "failed",
      durationMs: Date.now() - startedAt,
      diagnosticCode: code,
      stderr: error instanceof Error ? error.message : String(error)
    });
    findings.push({
      project: project.name,
      code,
      message: error instanceof Error ? error.message : String(error)
    });
  }

  return finishProject(project.name, startedAt, steps, findings);
}

function finishProject(
  name: string,
  startedAt: number,
  steps: RunStep[],
  findings: Finding[]
): { project: ProjectResult; findings: Finding[] } {
  return {
    project: {
      name,
      status: steps.some((step) => step.status === "failed") ? "failed" : "passed",
      durationMs: Date.now() - startedAt,
      steps
    },
    findings
  };
}

function commandResultToStep(
  name: "install" | "command",
  result: Awaited<ReturnType<typeof runShellCommand>>,
  commandName?: string
): RunStep {
  return {
    name,
    commandName,
    command: result.command,
    status: result.status,
    durationMs: result.durationMs,
    exitCode: result.exitCode,
    stdout: result.stdout,
    stderr: result.stderr,
    truncated: result.truncated,
    diagnosticCode: result.timedOut ? "DOWNSTREAM_TIMEOUT" : result.status === "failed" ? "UNKNOWN_FAILURE" : undefined
  };
}

function collectCommandFindings(
  project: string,
  step: RunStep,
  findings: Finding[],
  fallbackCode: DiagnosticCode
): void {
  if (step.truncated) {
    findings.push({ project, code: "OUTPUT_TRUNCATED", message: `${step.name} output was truncated` });
  }
  if (step.status === "failed") {
    findings.push({
      project,
      code: step.diagnosticCode === "DOWNSTREAM_TIMEOUT" ? "DOWNSTREAM_TIMEOUT" : fallbackCode,
      message: `${step.commandName ?? step.name} failed`
    });
  }
}

function withInstallScriptPolicy(command: string, packageManager: "npm" | "pnpm", installScripts: boolean): string {
  if (installScripts || command.includes("--ignore-scripts")) {
    return command;
  }
  if (packageManager === "npm" || packageManager === "pnpm") {
    return `${command} --ignore-scripts`;
  }
  return command;
}

function classifyError(error: unknown): DiagnosticCode {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("OVERRIDE_TARGET_MISSING")) {
    return "OVERRIDE_TARGET_MISSING";
  }
  return "UNKNOWN_FAILURE";
}
