// Configurar fuso horário do servidor para Brasil (UTC-3)
// DEVE ser a primeira linha antes de qualquer import que use Date
process.env.TZ = 'America/Sao_Paulo';

import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import { registerRoutes } from "./routes";
import { apiRateLimiter } from "./middleware/rateLimiter";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { updateMetrics } from "./routes/metrics";
import { scheduleCache } from "./services/scheduleCache";
import { getHealthStatus } from "./services/healthService";
import { captureError, initErrorMonitoring } from "./services/errorMonitoring";
import path from "path";
import type { Server } from "http";

// =============================================
//  Global Error Handlers
// =============================================
const errorMonitoringEnabled = initErrorMonitoring();
if (errorMonitoringEnabled) {
  console.log("✅ Error monitoring enabled");
}

process.on("uncaughtException", (error) => {
  console.error("🚨 Uncaught Exception:", error);
  captureError(error, {
    tags: { source: "uncaughtException" },
  });
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("🚨 Unhandled Rejection:", reason);
  captureError(reason instanceof Error ? reason : new Error(String(reason)), {
    tags: { source: "unhandledRejection" },
    extra: { promise: String(promise) },
  });
});

const app = express();
const isVercelRuntime = process.env.VERCEL === "1";

function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

// =============================================
//  Express Base Config
// =============================================
app.set("trust proxy", true);

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "'unsafe-eval'",
          "https://cdn.jsdelivr.net",
        ],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://fonts.googleapis.com",
        ],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "blob:", "https:"],
        connectSrc: [
          "'self'",
          process.env.NODE_ENV === "development" ? "ws:" : "",
          process.env.NODE_ENV === "development" ? "wss:" : "",
        ].filter(Boolean),
        workerSrc: ["'self'", "blob:"],
        frameSrc: ["'self'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests:
          process.env.NODE_ENV === "production" ? [] : null,
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
    frameguard:
      process.env.NODE_ENV === "development"
        ? false
        : { action: "deny" },
    noSniff: true,
    xssFilter: true,
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  })
);

// =============================================
//  Health & Root Routes
// =============================================
app.get("/health", async (_req: Request, res: Response) => {
  res.status(200).json(await getHealthStatus());
});

app.head("/health", (_req: Request, res: Response) => {
  res.status(200).end();
});

app.get("/health/live", async (_req: Request, res: Response) => {
  res.status(200).json(await getHealthStatus());
});

app.head("/health/live", (_req: Request, res: Response) => {
  res.status(200).end();
});

app.get("/health/ready", async (_req: Request, res: Response) => {
  const health = await getHealthStatus({ includeDatabase: true });
  res.status(health.status === "ok" ? 200 : 503).json(health);
});

app.head("/health/ready", async (_req: Request, res: Response) => {
  const health = await getHealthStatus({ includeDatabase: true });
  res.status(health.status === "ok" ? 200 : 503).end();
});

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    switch (character) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      case "'":
        return "&#39;";
      default:
        return character;
    }
  });
}

app.get("/", async (req: Request, res: Response) => {
  const health = await getHealthStatus({ includeDatabase: true });
  const payload = {
    name: "MESC Native API",
    status: health.status,
    environment: health.environment,
    apiVersion: "mobile-v1",
    links: {
      ready: "/health/ready",
      mobileConfig: "/api/mobile/v1/app/config",
      currentPwa: "https://saojudastadeu.replit.app",
    },
  };

  const acceptHeader = req.get("accept") || "";
  if (
    acceptHeader.includes("application/json") &&
    !acceptHeader.includes("text/html")
  ) {
    return res.status(health.status === "ok" ? 200 : 503).json(payload);
  }

  res
    .status(health.status === "ok" ? 200 : 503)
    .type("html")
    .send(`<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>MESC Native API</title>
    <style>
      :root {
        color-scheme: light dark;
        --bg: #fdfbf7;
        --surface: rgba(255, 255, 255, 0.76);
        --text: #2c2c2c;
        --muted: #6b6257;
        --primary: #722f37;
        --gold: #b38f4d;
      }
      @media (prefers-color-scheme: dark) {
        :root {
          --bg: #1a1a1a;
          --surface: rgba(44, 44, 44, 0.78);
          --text: #fdfbf7;
          --muted: #d5cabb;
        }
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        background: radial-gradient(circle at top, rgba(179, 143, 77, 0.22), transparent 36%), var(--bg);
        color: var(--text);
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      main {
        width: min(92vw, 560px);
        padding: 32px;
        border: 1px solid rgba(179, 143, 77, 0.26);
        border-radius: 12px;
        background: var(--surface);
        box-shadow: 0 24px 80px rgba(0, 0, 0, 0.18);
      }
      .mark {
        width: 48px;
        height: 48px;
        display: grid;
        place-items: center;
        border-radius: 10px;
        background: var(--primary);
        color: #f8e5ad;
        font-family: Georgia, serif;
        font-weight: 700;
      }
      h1 {
        margin: 20px 0 8px;
        font-family: Georgia, serif;
        font-size: 32px;
        line-height: 1.1;
      }
      p { margin: 0 0 20px; color: var(--muted); line-height: 1.55; }
      dl { display: grid; grid-template-columns: 1fr auto; gap: 10px 18px; margin: 0; }
      dt { color: var(--muted); }
      dd { margin: 0; font-weight: 700; }
      a { color: var(--primary); font-weight: 700; text-decoration-color: var(--gold); }
    </style>
  </head>
  <body>
    <main>
      <div class="mark">M</div>
      <h1>MESC Native API</h1>
      <p>Ambiente nativo do MESC Sao Judas Tadeu. O PWA atual continua em <a href="https://saojudastadeu.replit.app">saojudastadeu.replit.app</a>.</p>
      <dl>
        <dt>Status</dt><dd>${escapeHtml(payload.status)}</dd>
        <dt>Ambiente</dt><dd>${escapeHtml(payload.environment)}</dd>
        <dt>API mobile</dt><dd><a href="/api/mobile/v1/app/config">mobile-v1</a></dd>
        <dt>Healthcheck</dt><dd><a href="/health/ready">ready</a></dd>
      </dl>
    </main>
  </body>
</html>`);
});

// =============================================
//  CORS Configuration
// =============================================
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",")
  : [
      "http://localhost:5000",
      "http://localhost:3000",
      "http://127.0.0.1:5000",
    ];

const isLocalDevelopmentOrigin = (origin: string): boolean => {
  if (process.env.NODE_ENV !== "development") return false;

  try {
    const { hostname } = new URL(origin);
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
  } catch {
    return false;
  }
};

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const isAllowed = allowedOrigins.some((allowedOrigin) => {
        if (origin === allowedOrigin) return true;
        if (isLocalDevelopmentOrigin(origin)) return true;
        if (
          origin.includes(".replit.dev") ||
          origin.includes(".replit.com") ||
          origin.includes(".replit.app")
        ) {
          return true;
        }
        return false;
      });
      if (isAllowed) callback(null, true);
      else {
        if (process.env.NODE_ENV === "development") {
          console.warn(`🔴 CORS blocked: ${origin}`);
        }
        callback(new Error("Origin not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-CSRF-Token",
      "X-Community-Id",
      "X-Device-Id",
      "X-Platform",
      "X-App-Version",
      "Idempotency-Key",
    ],
    exposedHeaders: [
      "RateLimit-Limit",
      "RateLimit-Remaining",
      "RateLimit-Reset",
    ],
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// =============================================
//  ✅ WHATSAPP WEBHOOK DIRETO (SEM DEPENDÊNCIAS)
// =============================================
app.post("/api/whatsapp/webhook", express.json(), async (req, res) => {
  console.log("🔥 Recebido POST direto em /api/whatsapp/webhook");
  console.log("📦 Corpo recebido:", req.body);

  try {
    const { from, body } = req.body || {};
    console.log(`💬 Mensagem de ${from}: ${body}`);

    // Simulação de resposta imediata (teste)
    res.status(200).send("Webhook executado com sucesso!");

    // Quando quiser ativar o processamento real, descomente:
    // await handleMessage(req.body);
  } catch (err) {
    console.error("❌ Erro ao processar webhook:", err);
    res.status(500).send("Erro interno");
  }
});

console.log("✅ Webhook WhatsApp MESC registrado diretamente em /api/whatsapp/webhook");

// =============================================
//  Static Files, Logs e Rate Limiter
// =============================================
app.use(express.static(path.join(process.cwd(), "public")));
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

app.use((req, res, next) => {
  const start = Date.now();
  const originalPath = req.path;
  const originalMethod = req.method;
  
  // Capturar mensagem de erro se houver
  let errorMessage: string | undefined;
  const originalJson = res.json.bind(res);
  res.json = function (body: unknown) {
    if (res.statusCode >= 400 && body && typeof body === 'object') {
      const errorBody = body as Record<string, unknown>;
      errorMessage = (errorBody.message as string) || (errorBody.error as string) || JSON.stringify(body);
    }
    return originalJson(body);
  };
  
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (originalPath.startsWith("/api")) {
      const logLine = `${originalMethod} ${originalPath} ${res.statusCode} in ${duration}ms`;
      log(logLine);
      updateMetrics(res.statusCode, duration, originalPath, originalMethod, errorMessage);
    }
  });
  next();
});

// ⚠️ Mantenha o rate limiter após o webhook
app.use("/api", apiRateLimiter);

let bootstrapPromise: Promise<Server> | undefined;

// =============================================
//  Error Handling & Server Startup
// =============================================
async function bootstrapServer({ listen = true } = {}): Promise<Server> {
  if (bootstrapPromise) {
    return bootstrapPromise;
  }

  bootstrapPromise = (async () => {
    const server = await registerRoutes(app);

    // Use centralized error handler middleware
    app.use(errorHandler);

    const isDevelopment = process.env.NODE_ENV === "development";

    if (isDevelopment) {
      const viteModulePath = "./vite";
      const { setupVite } = await import(viteModulePath);
      await setupVite(app, server);
    } else if (!isVercelRuntime) {
      try {
        const { serveStatic } = await import("./static");
        serveStatic(app);
      } catch (error) {
        console.error("❌ Failed to configure static file serving:", error);
        process.exit(1);
      }
    }

    const port = parseInt(process.env.PORT || "5000", 10);

    server.on("error", (error: NodeJS.ErrnoException) => {
      console.error("❌ Server error:", error);
      if (error.code === "EADDRINUSE") {
        console.error(`❌ Port ${port} is already in use`);
      }
      process.exit(1);
    });

    // Clear schedule cache on startup to ensure fresh data after deployments
    await scheduleCache.clear();
    console.log("🧹 Schedule cache cleared on startup");

    if (listen) {
      server.listen(port, "0.0.0.0", () => {
        console.log(`✅ Server started on port ${port} (${process.env.NODE_ENV})`);
      });
    } else {
      console.log(`✅ Server bootstrapped for Vercel (${process.env.NODE_ENV})`);
    }

    return server;
  })();

  return bootstrapPromise;
}

await bootstrapServer({ listen: !isVercelRuntime });

export { app, bootstrapServer };
export default app;
