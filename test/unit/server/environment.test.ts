import { describe, expect, it } from "vitest";
import {
  getCorsRuntimeConfig,
  isOriginAllowed,
  parseAllowedOrigins,
  validateProductionEnvironment,
} from "../../../server/config/environment";

function validProductionEnv(overrides: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv {
  return {
    NODE_ENV: "production",
    DATABASE_URL: "postgresql://user:pass@db.mesc.test:5432/mesc?sslmode=require",
    JWT_SECRET: "a".repeat(64),
    SESSION_SECRET: "b".repeat(32),
    ENCRYPTION_KEY: "c".repeat(64),
    ALLOWED_ORIGINS: "https://app.mesc.test,capacitor://localhost",
    APP_URL: "https://app.mesc.test",
    EMAIL_PROVIDER: "resend",
    RESEND_API_KEY: `re_${"d".repeat(32)}`,
    SENTRY_DSN: "https://public@sentry.io/1",
    VITE_SENTRY_DSN: "https://public@sentry.io/2",
    BACKUP_PASSWORD: "backup-password-with-enough-entropy",
    ...overrides,
  };
}

describe("production environment validation", () => {
  it("accepts a complete production configuration", () => {
    const result = validateProductionEnvironment(validProductionEnv());

    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
  });

  it("rejects missing production database configuration", () => {
    const result = validateProductionEnvironment(
      validProductionEnv({ DATABASE_URL: "" })
    );

    expect(result.ok).toBe(false);
    expect(result.errors).toContain("DATABASE_URL precisa estar definido em producao.");
  });

  it("rejects placeholder secrets and invalid encryption keys", () => {
    const result = validateProductionEnvironment(
      validProductionEnv({
        JWT_SECRET: "CHANGE_ME_TO_RANDOM_64_CHAR_HEX_STRING",
        SESSION_SECRET: "CHANGE_ME_TO_RANDOM_BASE64_STRING",
        ENCRYPTION_KEY: "CHANGE_ME_TO_RANDOM_32_BYTE_HEX_STRING",
      })
    );

    expect(result.ok).toBe(false);
    expect(result.errors).toContain("JWT_SECRET ainda parece ser placeholder.");
    expect(result.errors).toContain("SESSION_SECRET ainda parece ser placeholder.");
    expect(result.errors).toContain("ENCRYPTION_KEY ainda parece ser placeholder.");
    expect(result.errors).toContain(
      "ENCRYPTION_KEY precisa ter exatamente 64 caracteres hexadecimais."
    );
  });

  it("rejects console email provider in production", () => {
    const result = validateProductionEnvironment(
      validProductionEnv({ EMAIL_PROVIDER: "console" })
    );

    expect(result.ok).toBe(false);
    expect(result.errors).toContain(
      "EMAIL_PROVIDER precisa ser resend, sendgrid ou smtp em producao."
    );
  });

  it("warns when frontend Sentry is missing while backend Sentry is configured", () => {
    const result = validateProductionEnvironment(
      validProductionEnv({ VITE_SENTRY_DSN: "" })
    );

    expect(result.ok).toBe(true);
    expect(result.warnings).toContain(
      "VITE_SENTRY_DSN nao esta configurado; erros do frontend nao serao enviados ao Sentry."
    );
  });

  it("requires a strong webhook secret when WhatsApp webhook is enabled", () => {
    const missingSecret = validateProductionEnvironment(
      validProductionEnv({
        ENABLE_WHATSAPP_WEBHOOK: "true",
        WHATSAPP_WEBHOOK_SECRET: "",
        WHATSAPP_API_KEY: "",
      })
    );

    expect(missingSecret.ok).toBe(false);
    expect(missingSecret.errors).toContain(
      "ENABLE_WHATSAPP_WEBHOOK=true exige WHATSAPP_WEBHOOK_SECRET."
    );

    const weakSecret = validateProductionEnvironment(
      validProductionEnv({
        ENABLE_WHATSAPP_WEBHOOK: "true",
        WHATSAPP_WEBHOOK_SECRET: "short",
      })
    );

    expect(weakSecret.ok).toBe(false);
    expect(weakSecret.errors).toContain(
      "WHATSAPP_WEBHOOK_SECRET precisa ser real e ter pelo menos 32 caracteres."
    );
  });
});

describe("CORS release policy", () => {
  it("normalizes configured web and native app origins", () => {
    expect(
      parseAllowedOrigins("https://app.mesc.test/, capacitor://localhost/")
    ).toEqual(["https://app.mesc.test", "capacitor://localhost"]);
  });

  it("allows exact production origins and native shell origins only", () => {
    const config = getCorsRuntimeConfig(
      validProductionEnv({
        ALLOWED_ORIGINS: "https://app.mesc.test,capacitor://localhost",
      })
    );

    expect(isOriginAllowed("https://app.mesc.test", config)).toBe(true);
    expect(isOriginAllowed("capacitor://localhost", config)).toBe(true);
    expect(isOriginAllowed("https://other.mesc.test", config)).toBe(false);
    expect(isOriginAllowed("https://random.replit.dev", config)).toBe(false);
  });

  it("allows localhost and Replit previews in development", () => {
    const config = getCorsRuntimeConfig({ NODE_ENV: "development" });

    expect(isOriginAllowed("http://localhost:3000", config)).toBe(true);
    expect(isOriginAllowed("https://preview.replit.dev", config)).toBe(true);
  });

  it("rejects wildcards and Replit preview broadening in production validation", () => {
    const result = validateProductionEnvironment(
      validProductionEnv({
        ALLOWED_ORIGINS: "*",
        ALLOW_REPLIT_PREVIEW_ORIGINS: "true",
      })
    );

    expect(result.ok).toBe(false);
    expect(result.errors).toContain(
      "ALLOWED_ORIGINS nao pode usar wildcard '*' em producao."
    );
    expect(result.errors).toContain(
      "ALLOW_REPLIT_PREVIEW_ORIGINS nao deve ficar ativo em producao."
    );
  });
});
