export type StepStatus = "passed" | "failed" | "skipped";
export type RunStatus = "passed" | "failed";

export type DiagnosticCode =
  | "DOWNSTREAM_INSTALL_FAILED"
  | "DOWNSTREAM_COMMAND_FAILED"
  | "DOWNSTREAM_TIMEOUT"
  | "OUTPUT_TRUNCATED"
  | "OVERRIDE_TARGET_MISSING"
  | "UNKNOWN_FAILURE";

export type RunStep = {
  name: "prepare" | "override" | "install" | "command";
  commandName?: string;
  command?: string;
  status: StepStatus;
  durationMs: number;
  exitCode?: number;
  stdout?: string;
  stderr?: string;
  truncated?: boolean;
  diagnosticCode?: DiagnosticCode;
};

export type ProjectResult = {
  name: string;
  status: RunStatus;
  durationMs: number;
  steps: RunStep[];
};

export type Finding = {
  project: string;
  code: DiagnosticCode;
  message: string;
};

export type JsonReport = {
  schemaVersion: "1.0";
  tool: "ecotrial";
  toolVersion: string;
  status: RunStatus;
  candidate: {
    packageName: string;
    source: string;
  };
  summary: {
    projects: number;
    passed: number;
    failed: number;
  };
  projects: ProjectResult[];
  findings: Finding[];
};
