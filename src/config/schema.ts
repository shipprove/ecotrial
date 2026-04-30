import { z } from "zod";

export const commandSchema = z.object({
  name: z.string().min(1),
  run: z.string().min(1)
});

export const projectSchema = z
  .object({
    name: z.string().min(1),
    repo: z.string().min(1).optional(),
    localPath: z.string().min(1).optional(),
    ref: z.string().min(1).optional(),
    packageManager: z.enum(["npm", "pnpm"]),
    override: z.object({
      strategy: z.literal("package-json-rewrite")
    }),
    install: z.string().min(1),
    commands: z.array(commandSchema).min(1),
    timeoutMinutes: z.number().positive().optional(),
    allowFailure: z
      .object({
        enabled: z.boolean().default(false),
        reason: z.string().min(1).optional(),
        until: z.string().min(1).optional()
      })
      .optional()
  })
  .refine((project) => Boolean(project.repo) !== Boolean(project.localPath), {
    message: "Exactly one of repo or localPath is required"
  });

const executionSchema = z
  .object({
    timeoutMinutes: z.number().positive().optional(),
    totalTimeoutMinutes: z.number().positive().optional(),
    keepWorkdir: z.boolean().optional(),
    installScripts: z.boolean().optional(),
    maxProjects: z.number().int().positive().max(5).optional(),
    maxOutputBytes: z.number().int().positive().optional(),
    maxJsonReportBytes: z.number().int().positive().optional(),
    maxLocalWorkspaceBytes: z.number().int().positive().optional()
  })
  .optional()
  .transform((execution) => ({
    timeoutMinutes: execution?.timeoutMinutes ?? 15,
    totalTimeoutMinutes: execution?.totalTimeoutMinutes ?? 20,
    keepWorkdir: execution?.keepWorkdir ?? false,
    installScripts: execution?.installScripts ?? true,
    maxProjects: execution?.maxProjects ?? 5,
    maxOutputBytes: execution?.maxOutputBytes ?? 200 * 1024,
    maxJsonReportBytes: execution?.maxJsonReportBytes ?? 256 * 1024,
    maxLocalWorkspaceBytes: execution?.maxLocalWorkspaceBytes ?? 50 * 1024 * 1024
  }));

export const ecotrialConfigSchema = z.object({
  candidate: z.object({
    packageName: z.string().min(1),
    source: z.string().min(1),
    packageRoot: z.string().min(1).default(".")
  }),
  baseline: z.unknown().optional(),
  execution: executionSchema,
  projects: z.array(projectSchema).min(1).max(5)
});

export type EcoTrialConfig = z.infer<typeof ecotrialConfigSchema>;
export type EcoTrialProjectConfig = z.infer<typeof projectSchema>;
