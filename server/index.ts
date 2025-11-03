import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { apiRateLimiter } from "./middleware/rateLimiter";
import path from "path";

// =============================================
//  Global Error Handlers
// =============================================
process.on("uncaughtException", (error) => {
  console.error("🚨 Uncaught Exception:", error);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("🚨 Unhandled Rejection:", reason);
});

const app = express();

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
app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

app.get("/", (_req: Request, res: Response, next) => {
  if (res.headersSent) return;
  const acceptHeader = _req.get("accept") || "";
  if (
    acceptHeader.includes("application/json") &&
    !acceptHeader.includes("text/html")
  ) {
    return res.status(200).json({ status: "ok" });
  }
  next();
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

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const isAllowed = allowedOrigins.some((allowedOrigin) => {
        if (origin === allowedOrigin) return true;
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
    allowedHeaders: ["Content-Type", "Authorization", "X-CSRF-Token"],
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
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (originalPath.startsWith("/api")) {
      const logLine = `${req.method} ${originalPath} ${res.statusCode} in ${duration}ms`;
      log(logLine);
    }
  });
  next();
});

// ⚠️ Mantenha o rate limiter após o webhook
app.use("/api", apiRateLimiter);

// =============================================
//  Error Handling & Server Startup
// =============================================
(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    console.error(`❌ ${status} ${req.method} ${req.path}: ${message}`);
    if (process.env.NODE_ENV === "development") console.error(err.stack);
    if (!res.headersSent) res.status(status).json({ message });
  });

  const isDevelopment = process.env.NODE_ENV === "development";

  if (isDevelopment) {
    await setupVite(app, server);
  } else {
    try {
      serveStatic(app);
    } catch (error) {
      console.error("❌ Failed to configure static file serving:", error);
      process.exit(1);
    }
  }

  const port = parseInt(process.env.PORT || "5000", 10);

  server.on("error", (error: any) => {
    console.error("❌ Server error:", error);
    if (error.code === "EADDRINUSE") {
      console.error(`❌ Port ${port} is already in use`);
    }
    process.exit(1);
  });

  server.listen(port, "0.0.0.0", () => {
    console.log(`✅ Server started on port ${port} (${process.env.NODE_ENV})`);
  });
})();