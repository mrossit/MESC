import { spawnSync } from "node:child_process";

const REQUIRED_CONFIRMATION = "true";
const CURRENT_REPLIT_PRODUCTION_HOST_MARKER =
  process.env.PRODUCTION_DB_HOST || "ep-lingering-firefly";

function requireDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    throw new Error("Defina DATABASE_URL para o banco nativo novo.");
  }

  try {
    return {
      databaseUrl,
      host: new URL(databaseUrl).hostname,
    };
  } catch {
    throw new Error("DATABASE_URL nao parece ser uma URL valida.");
  }
}

function guardEnvironment(host: string) {
  if (process.env.CONFIRM_NATIVE_SCHEMA_BOOTSTRAP !== REQUIRED_CONFIRMATION) {
    throw new Error(
      "Bootstrap recusado. Defina CONFIRM_NATIVE_SCHEMA_BOOTSTRAP=true para confirmar banco nativo novo.",
    );
  }

  if (process.env.REPLIT_DEPLOYMENT === "1") {
    throw new Error("Bootstrap recusado dentro do deployment Replit atual.");
  }

  if (host.includes(CURRENT_REPLIT_PRODUCTION_HOST_MARKER)) {
    throw new Error(
      "Bootstrap recusado: host parece ser o banco de producao atual do Replit.",
    );
  }
}

async function assertPublicSchemaIsEmpty(databaseUrl: string) {
  const postgres = (await import("postgres")).default;
  const sql = postgres(databaseUrl, { max: 1 });

  try {
    const rows = await sql<{ table_name: string }[]>`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `;

    if (rows.length > 0) {
      const preview = rows
        .slice(0, 20)
        .map((row) => row.table_name)
        .join(", ");
      throw new Error(
        `Bootstrap recusado: o schema public ja contem ${rows.length} tabela(s): ${preview}`,
      );
    }
  } finally {
    await sql.end({ timeout: 5 });
  }
}

function run(command: string, args: string[], env: NodeJS.ProcessEnv = process.env) {
  const result = spawnSync(command, args, {
    env,
    stdio: "inherit",
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} falhou com status ${result.status}.`);
  }
}

async function main() {
  const { databaseUrl, host } = requireDatabaseUrl();
  guardEnvironment(host);
  await assertPublicSchemaIsEmpty(databaseUrl);

  console.log("Banco nativo novo confirmado vazio. Aplicando schema atual...");
  run("npx", ["drizzle-kit", "push", "--force"], {
    ...process.env,
    ALLOW_DB_PUSH: "1",
  });

  console.log("Aplicando/confirmando migrations mobile idempotentes...");
  run("npm", ["run", "db:migrate:mobile"], process.env);

  console.log("Fechando o Data API e habilitando RLS nas tabelas nativas...");
  run("npm", ["run", "db:migrate:native-rls"], {
    ...process.env,
    CONFIRM_NATIVE_RLS_HARDENING: "true",
  });

  console.log("Validando fundacao mobile...");
  run("npm", ["run", "db:validate:mobile"], process.env);

  console.log("Validando hardening RLS...");
  run("npm", ["run", "db:validate:native-rls"], process.env);

  console.log("Bootstrap do banco nativo concluido.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
