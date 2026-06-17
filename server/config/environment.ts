type Env = NodeJS.ProcessEnv;

export interface EnvironmentValidationResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
}

export interface CorsRuntimeConfig {
  allowedOrigins: string[];
  allowLocalhostOrigins: boolean;
  allowReplitPreviewOrigins: boolean;
  isProductionLike: boolean;
}

const DEVELOPMENT_ORIGINS = [
  "http://localhost:5000",
  "http://localhost:3000",
  "http://127.0.0.1:5000",
];

const PLACEHOLDER_MARKERS = [
  "change_me",
  "your_",
  "your-",
  "_here",
  "xxxxxxxx",
  "seu-",
  "sua-",
  "seu_",
  "sua_",
  "seu-email",
  "sua_senha",
  "seu-dominio",
  "user:password@host",
  "example.com",
];

const NATIVE_APP_PROTOCOLS = new Set(["capacitor:", "ionic:"]);
const WEB_PROTOCOLS = new Set(["http:", "https:"]);

function splitCsv(value?: string): string[] {
  return (value ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function isTruthy(value?: string): boolean {
  return value === "true" || value === "1" || value === "yes";
}

export function isProductionLikeEnv(env: Env = process.env): boolean {
  if (env.NODE_ENV === "test") return false;
  return env.NODE_ENV === "production" || env.REPLIT_DEPLOYMENT === "1";
}

export function isPlaceholderValue(value?: string): boolean {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return true;
  return PLACEHOLDER_MARKERS.some((marker) => normalized.includes(marker));
}

export function normalizeCorsOrigin(origin: string): string | null {
  const trimmed = origin.trim().replace(/\/+$/, "");
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed);
    if (WEB_PROTOCOLS.has(url.protocol)) {
      return url.origin;
    }

    if (NATIVE_APP_PROTOCOLS.has(url.protocol) && url.host) {
      return `${url.protocol}//${url.host}`;
    }

    return null;
  } catch {
    return null;
  }
}

export function parseAllowedOrigins(value?: string): string[] {
  const origins = splitCsv(value)
    .map((origin) => normalizeCorsOrigin(origin))
    .filter((origin): origin is string => Boolean(origin));

  return [...new Set(origins)];
}

export function isLocalhostOrigin(origin: string): boolean {
  const normalized = normalizeCorsOrigin(origin);
  if (!normalized) return false;

  try {
    const url = new URL(normalized);
    if (!WEB_PROTOCOLS.has(url.protocol)) return false;
    return ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
  } catch {
    return false;
  }
}

export function isReplitPreviewOrigin(origin: string): boolean {
  const normalized = normalizeCorsOrigin(origin);
  if (!normalized) return false;

  try {
    const url = new URL(normalized);
    const hostname = url.hostname.toLowerCase();
    return ["replit.dev", "replit.app", "replit.com"].some(
      (domain) => hostname === domain || hostname.endsWith(`.${domain}`)
    );
  } catch {
    return false;
  }
}

export function getCorsRuntimeConfig(env: Env = process.env): CorsRuntimeConfig {
  const isProductionLike = isProductionLikeEnv(env);
  const configuredOrigins = parseAllowedOrigins(env.ALLOWED_ORIGINS);

  return {
    allowedOrigins:
      configuredOrigins.length > 0
        ? configuredOrigins
        : isProductionLike
          ? []
          : DEVELOPMENT_ORIGINS,
    allowLocalhostOrigins: !isProductionLike,
    allowReplitPreviewOrigins:
      !isProductionLike || isTruthy(env.ALLOW_REPLIT_PREVIEW_ORIGINS),
    isProductionLike,
  };
}

export function isOriginAllowed(
  origin: string | undefined,
  config: CorsRuntimeConfig = getCorsRuntimeConfig()
): boolean {
  if (!origin) return true;

  const normalized = normalizeCorsOrigin(origin);
  if (!normalized) return false;

  if (config.allowedOrigins.includes(normalized)) {
    return true;
  }

  if (config.allowLocalhostOrigins && isLocalhostOrigin(normalized)) {
    return true;
  }

  if (config.allowReplitPreviewOrigins && isReplitPreviewOrigin(normalized)) {
    return true;
  }

  return false;
}

function addRequired(
  env: Env,
  key: string,
  errors: string[],
  options: { minLength?: number } = {}
): string | undefined {
  const value = env[key]?.trim();
  if (!value) {
    errors.push(`${key} precisa estar definido em producao.`);
    return undefined;
  }

  if (isPlaceholderValue(value)) {
    errors.push(`${key} ainda parece ser placeholder.`);
  }

  if (options.minLength && value.length < options.minLength) {
    errors.push(`${key} precisa ter pelo menos ${options.minLength} caracteres.`);
  }

  return value;
}

function isValidUrl(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

function validateEmailProvider(env: Env, errors: string[]): void {
  const provider = env.EMAIL_PROVIDER?.trim().toLowerCase();
  if (!provider || provider === "console") {
    errors.push("EMAIL_PROVIDER precisa ser resend, sendgrid ou smtp em producao.");
    return;
  }

  if (provider === "resend") {
    addRequired(env, "RESEND_API_KEY", errors);
    return;
  }

  if (provider === "sendgrid") {
    addRequired(env, "SENDGRID_API_KEY", errors);
    return;
  }

  if (provider === "smtp") {
    addRequired(env, "SMTP_HOST", errors);
    addRequired(env, "SMTP_USER", errors);
    addRequired(env, "SMTP_PASS", errors, { minLength: 12 });
    return;
  }

  errors.push("EMAIL_PROVIDER tem valor desconhecido. Use resend, sendgrid ou smtp.");
}

function validateAllowedOrigins(env: Env, errors: string[], warnings: string[]): void {
  const rawOrigins = splitCsv(env.ALLOWED_ORIGINS);
  if (rawOrigins.length === 0) {
    errors.push("ALLOWED_ORIGINS precisa listar as origens exatas de producao.");
    return;
  }

  for (const rawOrigin of rawOrigins) {
    if (rawOrigin === "*") {
      errors.push("ALLOWED_ORIGINS nao pode usar wildcard '*' em producao.");
      continue;
    }

    if (isPlaceholderValue(rawOrigin)) {
      errors.push(`ALLOWED_ORIGINS contem placeholder: ${rawOrigin}`);
    }

    const normalized = normalizeCorsOrigin(rawOrigin);
    if (!normalized) {
      errors.push(`ALLOWED_ORIGINS contem origem invalida: ${rawOrigin}`);
      continue;
    }

    if (isLocalhostOrigin(normalized)) {
      warnings.push(
        `ALLOWED_ORIGINS contem localhost (${normalized}); use apenas se o app nativo realmente enviar esta origem.`
      );
    }

    if (normalized.startsWith("http://") && !isLocalhostOrigin(normalized)) {
      errors.push(`ALLOWED_ORIGINS deve usar HTTPS em producao: ${normalized}`);
    }

    if (isReplitPreviewOrigin(normalized)) {
      warnings.push(
        `ALLOWED_ORIGINS contem dominio Replit (${normalized}); prefira o dominio final da loja.`
      );
    }
  }
}

function validateAppUrl(env: Env, errors: string[]): void {
  const appUrl = addRequired(env, "APP_URL", errors);
  if (!appUrl) return;

  if (!isValidUrl(appUrl)) {
    errors.push("APP_URL precisa ser uma URL valida.");
    return;
  }

  const parsed = new URL(appUrl);
  if (parsed.protocol !== "https:") {
    errors.push("APP_URL precisa usar HTTPS em producao.");
  }
}

export function validateProductionEnvironment(
  env: Env = process.env
): EnvironmentValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!isProductionLikeEnv(env)) {
    errors.push("NODE_ENV=production ou REPLIT_DEPLOYMENT=1 precisa estar ativo.");
  }

  const databaseUrl = addRequired(env, "DATABASE_URL", errors);
  if (databaseUrl) {
    if (!/^postgres(ql)?:\/\//i.test(databaseUrl)) {
      errors.push("DATABASE_URL de producao precisa apontar para PostgreSQL.");
    }

    if (!databaseUrl.toLowerCase().includes("sslmode=require")) {
      warnings.push("DATABASE_URL deveria incluir sslmode=require quando o provedor suportar.");
    }
  }

  addRequired(env, "JWT_SECRET", errors, { minLength: 64 });
  addRequired(env, "SESSION_SECRET", errors, { minLength: 32 });

  const encryptionKey = addRequired(env, "ENCRYPTION_KEY", errors);
  if (encryptionKey && !/^[a-f0-9]{64}$/i.test(encryptionKey)) {
    errors.push("ENCRYPTION_KEY precisa ter exatamente 64 caracteres hexadecimais.");
  }

  validateAllowedOrigins(env, errors, warnings);
  validateAppUrl(env, errors);
  validateEmailProvider(env, errors);

  if (isTruthy(env.ALLOW_REPLIT_PREVIEW_ORIGINS)) {
    errors.push("ALLOW_REPLIT_PREVIEW_ORIGINS nao deve ficar ativo em producao.");
  }

  if (isTruthy(env.ENABLE_WHATSAPP_WEBHOOK)) {
    const secret = env.WHATSAPP_WEBHOOK_SECRET?.trim();
    const apiKeyFallback = env.WHATSAPP_API_KEY?.trim();
    if (!secret && !apiKeyFallback) {
      errors.push("ENABLE_WHATSAPP_WEBHOOK=true exige WHATSAPP_WEBHOOK_SECRET.");
    } else if (secret) {
      if (isPlaceholderValue(secret) || secret.length < 32) {
        errors.push("WHATSAPP_WEBHOOK_SECRET precisa ser real e ter pelo menos 32 caracteres.");
      }
    } else {
      warnings.push("Webhook WhatsApp esta usando WHATSAPP_API_KEY como fallback; prefira WHATSAPP_WEBHOOK_SECRET dedicado.");
    }
  }

  if (isTruthy(env.ENABLE_PUSH_NOTIFICATIONS)) {
    addRequired(env, "VAPID_PUBLIC_KEY", errors);
    addRequired(env, "VAPID_PRIVATE_KEY", errors);
    const subject = addRequired(env, "VAPID_SUBJECT", errors);
    if (subject && !subject.startsWith("mailto:") && !subject.startsWith("https://")) {
      errors.push("VAPID_SUBJECT precisa iniciar com mailto: ou https://.");
    }
  }

  if (!env.SENTRY_DSN || isPlaceholderValue(env.SENTRY_DSN)) {
    warnings.push("SENTRY_DSN nao esta configurado; recomendavel antes de publicar nas lojas.");
  } else if (!env.VITE_SENTRY_DSN || isPlaceholderValue(env.VITE_SENTRY_DSN)) {
    warnings.push("VITE_SENTRY_DSN nao esta configurado; erros do frontend nao serao enviados ao Sentry.");
  }

  if (!env.BACKUP_PASSWORD || isPlaceholderValue(env.BACKUP_PASSWORD)) {
    warnings.push("BACKUP_PASSWORD nao esta configurado; backups de producao ficarao fragilizados.");
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
  };
}
