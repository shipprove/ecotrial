const TOKEN_PATTERNS = [
  /gh[pousr]_[A-Za-z0-9_]{20,}/g,
  /npm_[A-Za-z0-9]{20,}/g,
  /Bearer\s+[A-Za-z0-9._~+/=-]{12,}/gi,
  /(Authorization:\s*)([^\r\n]+)/gi,
  /\b[A-Za-z0-9+/]{32,}={0,2}\b/g
];

const SECRET_ENV_PATTERN = /(^|_)(TOKEN|SECRET|PASSWORD|KEY)$/i;

export function maskSecrets(text: string, env: NodeJS.ProcessEnv = process.env): string {
  let masked = text;
  for (const [key, value] of Object.entries(env)) {
    if (value && value.length >= 4 && SECRET_ENV_PATTERN.test(key)) {
      masked = masked.split(value).join("[REDACTED]");
    }
  }
  for (const pattern of TOKEN_PATTERNS) {
    masked = masked.replace(pattern, (match, prefix: string | undefined) =>
      prefix ? `${prefix}[REDACTED]` : "[REDACTED]"
    );
  }
  return masked;
}
