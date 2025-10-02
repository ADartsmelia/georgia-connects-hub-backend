import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Load environment variables FIRST before any other imports
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../.env") });

import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
// import rateLimit from "express-rate-limit"; // Removed for debugging
import { createServer } from "http";
import { Server } from "socket.io";

// Routes will be imported after environment variables are loaded

// Import middleware
import { errorHandler } from "./middleware/errorHandler.js";
import { notFound } from "./middleware/notFound.js";
import { logger } from "./utils/logger.js";

// Import socket handlers
import { setupSocketHandlers } from "./socket/socketHandlers.js";

// Import Swagger documentation
import { specs, swaggerUi } from "./config/swagger.js";

// Environment variables already loaded at the top

// Import database connection after environment variables are loaded
import { sequelize } from "./database/connection.js";

// Import routes AFTER environment variables are loaded
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/users.js";
import postRoutes from "./routes/posts.js";
import connectionRoutes from "./routes/connections.js";
import chatRoutes from "./routes/chat.js";
import sponsorRoutes from "./routes/sponsors.js";
import mediaRoutes from "./routes/media.js";
import quizRoutes from "./routes/quiz.js";
import badgeRoutes from "./routes/badges.js";
import contestRoutes from "./routes/contests.js";
import playlistRoutes from "./routes/playlist.js";
import notificationRoutes from "./routes/notifications.js";
import agendaRoutes from "./routes/agenda.js";
import adminRoutes from "./routes/admin.js";
import qrRoutes from "./routes/qr.js";
import otpRoutes from "./routes/otp.js";

const app = express();

// Trust proxy for rate limiting and X-Forwarded-For headers
// This MUST be set before any middleware that uses req.ip
app.set("trust proxy", 1);

// Debug: Log trust proxy setting
console.log("Trust proxy setting:", app.get("trust proxy"));

const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || "http://localhost:8080",
    methods: ["GET", "POST"],
  },
});

const PORT = process.env.PORT || 3000;

// Rate limiting - temporarily disabled for testing
// const limiter = rateLimit({
//   windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
//   max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
//   message: {
//     error: "Too many requests from this IP, please try again later.",
//   },
//   standardHeaders: true,
//   legacyHeaders: false,
//   keyGenerator: (req) => {
//     // Debug: log the IP being used for rate limiting
//     console.log(`Rate limiting key: ${req.ip} (trust proxy: ${req.trust})`);
//     return req.ip;
//   },
// });

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:", "http:", "http://localhost:*"],
      },
    },
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

// CORS configuration - Allow all origins for development/testing
const corsOptions = {
  origin: true, // Allow all origins
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "Origin",
    "X-Requested-With",
    "Accept",
    "Content-Length",
    "Cache-Control",
    "X-File-Name",
  ],
  exposedHeaders: ["Content-Length", "X-File-Name"],
  maxAge: 86400, // 24 hours
};

app.use(cors(corsOptions));
app.use(compression());
app.use(
  morgan("combined", {
    stream: { write: (message) => logger.info(message.trim()) },
  })
);
// app.use(limiter); // Temporarily disabled for testing

// Debug: Log middleware setup
console.log("Middleware setup complete - no rate limiting applied");

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Static files with CORS headers
app.use(
  "/uploads",
  (req, res, next) => {
    // Set CORS headers for static files using the same logic as API CORS
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",") || [
      "http://localhost:8080",
    ];
    const origin = req.headers.origin;

    if (!origin || allowedOrigins.includes(origin)) {
      res.header("Access-Control-Allow-Origin", origin || "*");
    }
    res.header("Access-Control-Allow-Methods", "GET");
    res.header(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept"
    );
    next();
  },
  express.static(path.join(__dirname, "../uploads"))
);

// Health check endpoints
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
  });
});

// API version constant
const API_VERSION = process.env.API_VERSION || "v1";

// Versioned health check endpoint
app.get(`/api/${API_VERSION}/health`, (req, res) => {
  res.status(200).json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    version: API_VERSION,
  });
});

// API Documentation
app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(specs, {
    explorer: true,
    customCss: ".swagger-ui .topbar { display: none }",
    customSiteTitle: "Georgia Connects Hub API Documentation",
  })
);

// Serve API spec as JSON
app.get("/api-docs.json", (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.send(specs);
});

// API routes
app.use(`/api/${API_VERSION}/auth`, authRoutes);
app.use(`/api/${API_VERSION}/users`, userRoutes);
app.use(`/api/${API_VERSION}/posts`, postRoutes);
app.use(`/api/${API_VERSION}/connections`, connectionRoutes);
app.use(`/api/${API_VERSION}/chat`, chatRoutes);
app.use(`/api/${API_VERSION}/sponsors`, sponsorRoutes);
app.use(`/api/${API_VERSION}/media`, mediaRoutes);
app.use(`/api/${API_VERSION}/quiz`, quizRoutes);
app.use(`/api/${API_VERSION}/badges`, badgeRoutes);
app.use(`/api/${API_VERSION}/contests`, contestRoutes);
app.use(`/api/${API_VERSION}/playlist`, playlistRoutes);
app.use(`/api/${API_VERSION}/notifications`, notificationRoutes);
app.use(`/api/${API_VERSION}/agenda`, agendaRoutes);
app.use(`/api/${API_VERSION}/admin`, adminRoutes);
app.use(`/api/${API_VERSION}/qr`, qrRoutes);
// app.use(`/api/${API_VERSION}/uploads`, uploadRoutes);
app.use(`/api/${API_VERSION}/otp`, otpRoutes);

// Setup socket.io handlers
setupSocketHandlers(io);

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

// Database connection and server startup
async function startServer() {
  try {
    // Test database connection
    await sequelize.authenticate();
    logger.info("Database connection established successfully.");

    // Sync database models
    if (process.env.NODE_ENV === "development") {
      await sequelize.sync({ alter: false });
      logger.info("Database models synchronized.");
    }

    // Start server
    server.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);
      logger.info(`📊 Environment: ${process.env.NODE_ENV}`);
      logger.info(`🔗 Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on("SIGTERM", async () => {
  logger.info("SIGTERM received, shutting down gracefully");
  server.close(() => {
    logger.info("Process terminated");
    process.exit(0);
  });
});

process.on("SIGINT", async () => {
  logger.info("SIGINT received, shutting down gracefully");
  server.close(() => {
    logger.info("Process terminated");
    process.exit(0);
  });
});

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  logger.error("Uncaught Exception:", error);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});

startServer();

export { app, io };
