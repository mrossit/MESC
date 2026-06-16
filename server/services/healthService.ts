import { sql } from "drizzle-orm";
import { db } from "../db";

type DatabaseHealthClient = {
  execute?: (query: ReturnType<typeof sql>) => unknown;
  get?: (query: ReturnType<typeof sql>) => unknown;
};

export interface HealthCheckResult {
  status: "ok" | "degraded";
  timestamp: string;
  uptime: number;
  environment: string;
  database?: {
    status: "ok" | "error";
    latencyMs: number;
    message?: string;
  };
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}

async function checkDatabaseConnection(): Promise<void> {
  const healthQuery = sql`SELECT 1 AS ready`;
  const database = db as unknown as DatabaseHealthClient;

  if (typeof database.execute === "function") {
    await database.execute(healthQuery);
    return;
  }

  if (typeof database.get === "function") {
    await Promise.resolve(database.get(healthQuery));
    return;
  }

  throw new Error("Database adapter does not support health checks.");
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  label: string
): Promise<T> {
  let timeout: NodeJS.Timeout | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => {
      reject(new Error(`${label} timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}

export async function getHealthStatus(options: {
  includeDatabase?: boolean;
  databaseTimeoutMs?: number;
} = {}): Promise<HealthCheckResult> {
  const status: HealthCheckResult = {
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "unknown",
  };

  if (!options.includeDatabase) {
    return status;
  }

  const startedAt = Date.now();

  try {
    await withTimeout(
      checkDatabaseConnection(),
      options.databaseTimeoutMs ?? 2500,
      "Database health check"
    );

    status.database = {
      status: "ok",
      latencyMs: Date.now() - startedAt,
    };
  } catch (error) {
    status.status = "degraded";
    status.database = {
      status: "error",
      latencyMs: Date.now() - startedAt,
      message: getErrorMessage(error),
    };
  }

  return status;
}
