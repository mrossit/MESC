import { fileURLToPath } from "node:url";

interface HealthProbe {
  path: string;
  requireDatabase?: boolean;
}

interface ProbeResult {
  path: string;
  ok: boolean;
  status: number;
  message: string;
  latencyMs: number;
}

const probes: HealthProbe[] = [
  { path: "/health" },
  { path: "/health/ready", requireDatabase: true },
  { path: "/api/health" },
  { path: "/api/health/ready", requireDatabase: true },
];

function getArg(name: string): string | undefined {
  const prefix = `--${name}=`;
  return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}

function printHelp() {
  console.log(`
Usage:
  npm run release:check:health -- --url=https://app.example.com

Environment fallback:
  PRODUCTION_BASE_URL=https://app.example.com npm run release:check:health
  APP_URL=https://app.example.com npm run release:check:health
`);
}

function normalizeBaseUrl(value?: string): string {
  const baseUrl = value?.trim().replace(/\/+$/, "");
  if (!baseUrl) {
    throw new Error("Informe --url, PRODUCTION_BASE_URL ou APP_URL.");
  }

  const parsed = new URL(baseUrl);
  const isLocal =
    parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";

  if (parsed.protocol !== "https:" && !isLocal) {
    throw new Error("Health check de producao exige URL HTTPS.");
  }

  return parsed.toString().replace(/\/+$/, "");
}

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function probe(baseUrl: string, healthProbe: HealthProbe): Promise<ProbeResult> {
  const url = `${baseUrl}${healthProbe.path}`;
  const startedAt = Date.now();

  try {
    const response = await fetchWithTimeout(url, 5000);
    const latencyMs = Date.now() - startedAt;
    const body = await response.json().catch(() => ({}));
    const databaseStatus = body?.database?.status;
    const status = body?.status;

    const ok =
      response.ok &&
      status === "ok" &&
      (!healthProbe.requireDatabase || databaseStatus === "ok");

    return {
      path: healthProbe.path,
      ok,
      status: response.status,
      latencyMs,
      message: ok
        ? "ok"
        : `status=${status ?? "unknown"} database=${databaseStatus ?? "not_checked"}`,
    };
  } catch (error) {
    return {
      path: healthProbe.path,
      ok: false,
      status: 0,
      latencyMs: Date.now() - startedAt,
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

async function main() {
  if (process.argv.includes("--help")) {
    printHelp();
    return;
  }

  const baseUrl = normalizeBaseUrl(
    getArg("url") || process.env.PRODUCTION_BASE_URL || process.env.APP_URL
  );

  console.log(`Checking production health: ${baseUrl}`);

  const results = await Promise.all(probes.map((item) => probe(baseUrl, item)));
  for (const result of results) {
    const marker = result.ok ? "PASS" : "FAIL";
    console.log(
      `${marker} ${result.path} HTTP ${result.status} ${result.latencyMs}ms - ${result.message}`
    );
  }

  const failed = results.filter((result) => !result.ok);
  if (failed.length > 0) {
    throw new Error(`${failed.length} health probe(s) failed.`);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
