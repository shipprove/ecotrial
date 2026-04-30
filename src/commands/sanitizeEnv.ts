const PASS_ENV = new Set([
  "PATH",
  "HOME",
  "USER",
  "SHELL",
  "TMPDIR",
  "TEMP",
  "TMP",
  "CI",
  "npm_config_cache",
  "npm_config_store_dir",
  "PNPM_HOME",
  "COREPACK_HOME",
  "NODE_OPTIONS"
]);

const SECRET_NAME_PATTERN = /(^|_)(TOKEN|SECRET|PASSWORD|KEY)$/i;

export function sanitizeEnv(env: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
  const sanitized: NodeJS.ProcessEnv = {};
  for (const [key, value] of Object.entries(env)) {
    if (value === undefined) {
      continue;
    }
    if (SECRET_NAME_PATTERN.test(key)) {
      continue;
    }
    if (PASS_ENV.has(key)) {
      sanitized[key] = value;
    }
  }
  return sanitized;
}
