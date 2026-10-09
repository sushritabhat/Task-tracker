const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");

dotenv.config();

const taskRoutes = require("./routes/taskRoutes");
const authRoutes = require("./routes/authRoutes");

const app = express();
const PORT = Number(process.env.PORT) || 5000;
const authAttempts = new Map();
const AUTH_WINDOW_MS = 15 * 60 * 1000;
const AUTH_MAX_ATTEMPTS = 30;
const allowedOrigins = (process.env.CLIENT_ORIGIN || "http://localhost:5173,http://127.0.0.1:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

app.disable("x-powered-by");
app.set("trust proxy", process.env.TRUST_PROXY === "true" ? 1 : false);
app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    if (process.env.NODE_ENV === "production") {
        res.setHeader("Strict-Transport-Security", "max-age=31536000");
    }
    next();
});
app.use(cors({
    origin(origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
        return callback(new Error("Origin is not allowed by CORS"));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
    maxAge: 600
}));
app.use(express.json({ limit: "100kb", strict: true }));
app.use("/api", (req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    const mutatingMethod = ["POST", "PUT", "PATCH", "DELETE"].includes(req.method);
    const origin = req.get("Origin");
    if (mutatingMethod && origin && !allowedOrigins.includes(origin)) {
        return res.status(403).json({ message: "Origin is not allowed" });
    }
    return next();
});

app.get("/", (req, res) => {
    res.json({ name: "TaskFlow API", status: "ok" });
});
app.get("/health/live", (req, res) => res.status(200).json({ status: "ok" }));
app.get("/health/ready", async (req, res) => {
    try {
        if (mongoose.connection.readyState !== 1) throw new Error("MongoDB is disconnected");
        await mongoose.connection.db.admin().ping();
        return res.status(200).json({ status: "ok", database: "connected" });
    } catch {
        return res.status(503).json({ status: "unavailable", database: "disconnected" });
    }
});

app.use("/api/auth", (req, res, next) => {
    if (!/^\/(login|register)$/.test(req.path)) return next();
    const key = `${req.ip}:${req.path}`;
    const now = Date.now();
    const current = authAttempts.get(key);
    if (!current || current.resetAt <= now) {
        authAttempts.set(key, { count: 1, resetAt: now + AUTH_WINDOW_MS });
        return next();
    }
    current.count += 1;
    if (current.count > AUTH_MAX_ATTEMPTS) {
        res.setHeader("Retry-After", Math.ceil((current.resetAt - now) / 1000));
        return res.status(429).json({ message: "Too many authentication attempts. Try again later." });
    }
    return next();
});

setInterval(() => {
    const now = Date.now();
    for (const [key, value] of authAttempts) {
        if (value.resetAt <= now) authAttempts.delete(key);
    }
}, AUTH_WINDOW_MS).unref();

app.use("/api", (req, res, next) => {
    if (req.path === "/auth/logout" && req.method === "POST") return next();
    if (mongoose.connection.readyState === 1) return next();
    res.setHeader("Retry-After", "5");
    return res.status(503).json({ message: "The database is temporarily unavailable" });
});
app.use("/api/tasks", taskRoutes);
app.use("/api/auth", authRoutes);

app.use((req, res) => res.status(404).json({ message: "Route not found" }));
app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    if (error.type === "entity.too.large") {
        return res.status(413).json({ message: "Request body exceeds the 100kb limit" });
    }
    if (error instanceof SyntaxError && error.status === 400 && "body" in error) {
        return res.status(400).json({ message: "Request body must contain valid JSON" });
    }
    if (error.message === "Origin is not allowed by CORS") {
        return res.status(403).json({ message: "Origin is not allowed" });
    }
    console.error("Request error:", error.message);
    return res.status(500).json({ message: "An unexpected server error occurred" });
});

async function start() {
    if (!process.env.MONGO_URI) throw new Error("MONGO_URI is required");
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
        throw new Error("JWT_SECRET must be set to a random secret of at least 32 characters");
    }
    if (!process.env.MONGO_URI.startsWith("mongodb://") && !process.env.MONGO_URI.startsWith("mongodb+srv://")) {
        throw new Error("MONGO_URI must be a valid MongoDB connection string");
    }

    const server = app.listen(PORT, "0.0.0.0", () => {
        console.log(`TaskFlow API listening on port ${PORT}`);
    });

    let connecting = false;
    let hasConnected = false;
    let isShuttingDown = false;
    let retryTimer;
    const scheduleDatabaseRetry = () => {
        if (retryTimer || isShuttingDown) return;
        retryTimer = setTimeout(() => {
            retryTimer = undefined;
            void connectDatabase();
        }, 5000);
        retryTimer.unref();
    };
    const connectDatabase = async () => {
        if (connecting || mongoose.connection.readyState === 1) return;
        connecting = true;
        try {
            await mongoose.connect(process.env.MONGO_URI, {
                serverSelectionTimeoutMS: Number(process.env.MONGO_TIMEOUT_MS) || 10000
            });
            hasConnected = true;
            console.log("MongoDB connected");
        } catch (error) {
            console.error("MongoDB connection failed:", error.message);
            scheduleDatabaseRetry();
        } finally {
            connecting = false;
        }
    };
    mongoose.connection.on("disconnected", () => {
        if (!hasConnected) return;
        console.error("MongoDB disconnected; reconnecting");
        scheduleDatabaseRetry();
    });
    void connectDatabase();

    const shutdown = (signal) => {
        isShuttingDown = true;
        console.log(`${signal} received; shutting down`);
        clearTimeout(retryTimer);
        server.close(async () => {
            await mongoose.disconnect();
            process.exit(0);
        });
        setTimeout(() => process.exit(1), 10000).unref();
    };
    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));
}

start().catch((error) => {
    console.error("API startup failed:", error.message);
    process.exitCode = 1;
});

module.exports = app;
