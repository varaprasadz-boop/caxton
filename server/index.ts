import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import { registerRoutes } from "./routes";
import { setupVite, log } from "./vite"; // removed serveStatic import
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
app.use(cors({
  origin: [
    "http://localhost:3000",              // local dev
    "http://localhost:5173",              // local dev
    "https://caxton-services.onrender.com" // your deployed frontend URL
  ],
  credentials: true   // 👈 allow cookies
}));

const PORT = process.env.PORT || 3000;

// Session configuration


app.use(session({
  secret: process.env.SESSION_SECRET || 'caxton-php-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // only over HTTPS
    httpOnly: true,
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // 👈 important
    maxAge: 24 * 60 * 60 * 1000
  }
}));


// API request logger
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
