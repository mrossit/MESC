import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

interface CommandResult {
  stdout: string;
  stderr: string;
}

const backupDir = process.env.BACKUP_DIR || path.join(process.cwd(), "backups");

function getArg(name: string): string | undefined {
  const prefix = `--${name}=`;
  return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function printHelp() {
  console.log(`
Usage:
  DATABASE_URL=postgres://... npm run release:check:backup

Optional destructive restore validation against a disposable staging database:
  DATABASE_URL=postgres://source \\
  RESTORE_DATABASE_URL=postgres://disposable-target \\
  ALLOW_DESTRUCTIVE_RESTORE=true \\
  npm run release:check:backup -- --restore

Options:
  --backup-file=/path/to/backup.dump  Reuse an existing backup instead of creating one.
  --restore                           Restore into RESTORE_DATABASE_URL after verifying the dump.
`);
}

function requireDatabaseUrl(): string {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    throw new Error("DATABASE_URL precisa estar definido.");
  }
  return databaseUrl;
}

function parsePgEnv(databaseUrl: string): NodeJS.ProcessEnv {
  const url = new URL(databaseUrl);
  const database = decodeURIComponent(url.pathname.replace(/^\//, ""));

  if (!url.hostname || !database) {
    throw new Error("DATABASE_URL invalida para pg_dump/pg_restore.");
  }

  return {
    PGHOST: url.hostname,
    PGPORT: url.port || "5432",
    PGDATABASE: database,
    PGUSER: decodeURIComponent(url.username),
    PGPASSWORD: decodeURIComponent(url.password),
    PGSSLMODE: url.searchParams.get("sslmode") || "require",
  };
}

function runCommand(
  command: string,
  args: string[],
  env: NodeJS.ProcessEnv
): Promise<CommandResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      env: { ...process.env, ...env },
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => {
      reject(new Error(`${command} nao esta disponivel: ${error.message}`));
    });
    child.on("close", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        const versionMismatchHint =
          command === "pg_dump" && stderr.includes("server version mismatch")
            ? "\nDica: o pg_dump local precisa ter a mesma versao major do PostgreSQL alvo ou uma versao mais nova. Para validar restore sem novo dump, reutilize um dump ja verificado com --backup-file=/caminho/backup.dump."
            : "";

        reject(
          new Error(
            `${command} falhou com codigo ${code}.${stderr ? `\n${stderr}` : ""}${versionMismatchHint}`
          )
        );
      }
    });
  });
}

async function assertToolAvailable(command: string) {
  await runCommand(command, ["--version"], {});
}

async function createBackup(databaseUrl: string): Promise<string> {
  await fs.mkdir(backupDir, { recursive: true });

  const filename = `backup-release-${new Date().toISOString().replace(/[:.]/g, "-")}.dump`;
  const backupPath = path.join(backupDir, filename);

  console.log(`Creating custom-format backup: ${backupPath}`);
  await runCommand(
    "pg_dump",
    ["--format=custom", "--no-owner", "--no-privileges", "--file", backupPath],
    parsePgEnv(databaseUrl)
  );

  return backupPath;
}

async function verifyBackupFile(backupPath: string) {
  const stats = await fs.stat(backupPath);
  if (stats.size === 0) {
    throw new Error("Backup invalido: arquivo vazio.");
  }

  await runCommand("pg_restore", ["--list", backupPath], {});
  console.log(`Backup verified: ${(stats.size / (1024 * 1024)).toFixed(2)} MB`);
}

async function resetTargetDatabase(restoreDatabaseUrl: string) {
  const sql = postgres(restoreDatabaseUrl, {
    max: 1,
    ssl: restoreDatabaseUrl.includes("sslmode=require") ? "require" : undefined,
  });

  try {
    await sql.unsafe("DROP SCHEMA IF EXISTS public CASCADE");
    await sql.unsafe("CREATE SCHEMA public");
  } finally {
    await sql.end();
  }
}

async function restoreBackup(backupPath: string, restoreDatabaseUrl: string) {
  if (restoreDatabaseUrl === process.env.DATABASE_URL) {
    throw new Error("RESTORE_DATABASE_URL nao pode ser igual a DATABASE_URL.");
  }

  if (process.env.ALLOW_DESTRUCTIVE_RESTORE !== "true") {
    throw new Error(
      "Restore validation e destrutivo. Defina ALLOW_DESTRUCTIVE_RESTORE=true para rodar em um banco descartavel."
    );
  }

  console.log("Resetting target database schema...");
  await resetTargetDatabase(restoreDatabaseUrl);

  console.log("Restoring backup into target database...");
  const pgEnv = parsePgEnv(restoreDatabaseUrl);
  await runCommand(
    "pg_restore",
    ["--no-owner", "--no-privileges", "--dbname", pgEnv.PGDATABASE!, backupPath],
    pgEnv
  );
}

async function verifyRestoredDatabase(restoreDatabaseUrl: string) {
  const sql = postgres(restoreDatabaseUrl, {
    max: 1,
    ssl: restoreDatabaseUrl.includes("sslmode=require") ? "require" : undefined,
  });

  try {
    const tables = await sql<{ table_name: string }[]>`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `;

    const tableNames = new Set(tables.map((table) => table.table_name));
    for (const table of ["users", "questionnaires", "schedules"]) {
      if (!tableNames.has(table)) {
        throw new Error(`Tabela restaurada ausente: ${table}`);
      }
    }

    const counts = await sql<{ table_name: string; row_count: string }[]>`
      SELECT 'users' AS table_name, COUNT(*)::text AS row_count FROM users
      UNION ALL
      SELECT 'questionnaires' AS table_name, COUNT(*)::text AS row_count FROM questionnaires
      UNION ALL
      SELECT 'schedules' AS table_name, COUNT(*)::text AS row_count FROM schedules
    `;

    for (const count of counts) {
      console.log(`Restored ${count.table_name}: ${count.row_count} rows`);
    }
  } finally {
    await sql.end();
  }
}

async function main() {
  if (process.argv.includes("--help")) {
    printHelp();
    return;
  }

  const existingBackupPath = getArg("backup-file");
  const databaseUrl = existingBackupPath ? process.env.DATABASE_URL?.trim() : requireDatabaseUrl();

  if (!existingBackupPath) {
    await assertToolAvailable("pg_dump");
  }
  await assertToolAvailable("pg_restore");

  const backupPath = existingBackupPath || (await createBackup(databaseUrl!));

  await verifyBackupFile(backupPath);

  if (!hasFlag("restore")) {
    console.log("Backup/verify check passed. Restore validation skipped.");
    return;
  }

  const restoreDatabaseUrl = process.env.RESTORE_DATABASE_URL?.trim();
  if (!restoreDatabaseUrl) {
    throw new Error("RESTORE_DATABASE_URL precisa estar definido para --restore.");
  }

  await restoreBackup(backupPath, restoreDatabaseUrl);
  await verifyRestoredDatabase(restoreDatabaseUrl);
  console.log("Backup restore validation passed.");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
