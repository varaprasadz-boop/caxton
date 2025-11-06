import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import { registerRoutes } from "./routes";
import { setupVite, log } from "./vite";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import pgSession from "connect-pg-simple";

const PgSession = pgSession(session);

// Polyfill for __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// ✅ CORS (only needed for local dev, safe in prod since same origin)
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://localhost:5173",
      "https://crmcaxton.in",
      "https://caxton-services.onrender.com", // same origin in prod
    ],
    credentials: true,
  })
);

const PORT = process.env.PORT || 3000;

// ✅ Session configuration (with Postgres store)
app.set("trust proxy", 1); // 👈 required for secure cookies behind Render proxy

app.use(
  session({
    store: new PgSession({
      conString: process.env.DATABASE_URL, // Neon Postgres
      createTableIfMissing: true,
    }),
    secret:
      process.env.SESSION_SECRET ||
      "caxton-php-secret-key-change-in-production",
    resave: false,
    saveUninitialized: false,
    proxy: true,
    cookie: {
      secure: process.env.NODE_ENV === "production", // cookies only over https in prod
      httpOnly: true,
      sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax", // same origin → strict/lax is fine
      maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
    },
  })
);

// ✅ API request logger
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  if (app.get("env") === "development") {
    // Dev mode -> Vite
    await setupVite(app, server);
  } else {
    // Production -> Serve React build
    const clientPath = path.join(__dirname, "../dist/public");
    app.use(express.static(clientPath));

    // React catch-all (for client-side routing)
    app.get("*", (_, res) => {
      res.sendFile(path.join(clientPath, "index.html"));
    });
  }

  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
    }
  );
})();
