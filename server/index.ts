import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { apiRateLimiter } from "./middleware/rateLimiter";
import path from "path";

// Global error handlers to prevent server crashes
process.on('uncaughtException', (error) => {
  log(`Uncaught Exception: ${error.message}`);
  console.error('Uncaught Exception:', error);
  // Don't exit the process, just log the error
});

process.on('unhandledRejection', (reason, promise) => {
  log(`Unhandled Rejection at: ${promise}, reason: ${reason}`);
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit the process, just log the error
});

const app = express();

// Trust proxy for Replit deployment (needed for rate limiter and CORS)
app.set('trust proxy', true);

// CRITICAL: Health check endpoints MUST be registered FIRST
// before any middleware that might delay the response
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Root path handler for deployment health checks
app.get('/', (_req: Request, res: Response, next) => {
  // In production, this will be overridden by static file serving
  // But it ensures health checks work during initialization
  if (res.headersSent) return;
  
  // Only respond with JSON if explicitly requesting JSON (for health checks)
  // Otherwise, let Vite or static file serving handle it
  const acceptHeader = _req.get('accept') || '';
  if (acceptHeader.includes('application/json') && !acceptHeader.includes('text/html')) {
    return res.status(200).json({ status: 'ok' });
  }
  
  next();
});

// CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:5000', 'http://localhost:3000'];

app.use(cors({
  origin: (origin, callback) => {
    // Permitir requests sem origin (mobile apps, Postman, etc)
    if (!origin) return callback(null, true);

    // Permitir qualquer domínio Replit
    if (origin && origin.includes('.replit.dev')) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`CORS: Origem não permitida: ${origin}`);
      callback(null, true); // Temporariamente permitindo todas as origens para debug
    }
  },
  credentials: true, // Permitir cookies e headers de auth
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
  exposedHeaders: ['RateLimit-Limit', 'RateLimit-Remaining', 'RateLimit-Reset']
}));

// Rate limiting global para todas as rotas da API
app.use('/api', apiRateLimiter);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Serve static files from public directory
app.use(express.static(path.join(process.cwd(), 'public')));

// Serve uploaded files
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Request logging middleware
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

(async () => {

  const server = await registerRoutes(app);

  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    // Log the error instead of throwing it
    log(`Error ${status} on ${req.method} ${req.path}: ${message}`);
    console.error('Request error:', {
      method: req.method,
      path: req.path,
      status,
      message,
      stack: err.stack
    });

    // Send error response to client
    if (!res.headersSent) {
      res.status(status).json({ message });
    }
    
    // Do NOT throw the error - this was causing server crashes
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  const isDevelopment = process.env.NODE_ENV === "development";
  console.log(`Environment: ${process.env.NODE_ENV}, isDevelopment: ${isDevelopment}`);
  
  if (isDevelopment) {
    await setupVite(app, server);
  } else {
    try {
      serveStatic(app);
      console.log("Static file serving configured for production");
    } catch (error) {
      console.error("Failed to configure static file serving:", error);
      process.exit(1);
    }
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5005', 10);
  
  server.on('error', (error: any) => {
    console.error('Server error:', error);
    if (error.code === 'EADDRINUSE') {
      console.error(`Port ${port} is already in use`);
    }
    process.exit(1);
  });
  
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
    console.log(`Server successfully started on http://0.0.0.0:${port}`);
    console.log(`Environment: ${process.env.NODE_ENV}`);
  });
})();
