import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

// ============================================================================
// GUARD: bloqueia `drizzle-kit push` contra PRODUÇÃO.
// ----------------------------------------------------------------------------
// Em 2026-06 um `drizzle-kit push` automático (redeploy) recriou as tabelas de
// produção e apagou as escalas de Mar–Jun. `push` faz sync destrutivo de schema
// (drop/recreate) — em produção SEMPRE use migrations (`drizzle-kit migrate`).
// Este guard intercepta qualquer invocação de push (npm run db:push ou binário
// direto), porque o drizzle-kit sempre carrega este arquivo de config.
// Override consciente (NÃO recomendado): ALLOW_DB_PUSH=1
// ============================================================================
const isPushCommand = process.argv.some((a) => a === "push");
const prodHostMarker = process.env.PRODUCTION_DB_HOST || "ep-lingering-firefly";

let targetHost = "";
try {
  targetHost = new URL(process.env.DATABASE_URL).hostname;
} catch {
  /* sqlite/local — sem host */
}

const isProductionTarget =
  process.env.REPLIT_DEPLOYMENT === "1" ||
  process.env.NODE_ENV === "production" ||
  (!!targetHost && targetHost.includes(prodHostMarker));

if (isPushCommand && isProductionTarget && process.env.ALLOW_DB_PUSH !== "1") {
  const safeHost = targetHost
    ? targetHost.replace(/^([^.]{0,8}).*/, "$1***")
    : "(local)";
  throw new Error(
    [
      "",
      "🚫 BLOQUEADO: `drizzle-kit push` contra PRODUÇÃO foi impedido.",
      `   Alvo detectado: host=${safeHost}  (REPLIT_DEPLOYMENT=${process.env.REPLIT_DEPLOYMENT ?? "0"}, NODE_ENV=${process.env.NODE_ENV ?? "?"})`,
      "",
      "   `push` faz sync destrutivo de schema (drop/recreate) e JÁ causou perda",
      "   de dados nesta base. Em produção use SEMPRE migrations:",
      "       npx drizzle-kit generate   # gera a migration a partir do schema",
      "       npx drizzle-kit migrate    # aplica de forma segura",
      "",
      "   Se você REALMENTE sabe o que está fazendo: ALLOW_DB_PUSH=1 npm run db:push",
      "",
    ].join("\n"),
  );
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
