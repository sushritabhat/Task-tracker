const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const authMiddleware = require("../middleware/authMiddleware");
const { normalizeEmail, validateRegistrationInput, validateLoginInput } = require("../utils/authValidation");
const formatUser = require("../utils/formatUser");

const TOKEN_LIFETIME = process.env.JWT_TTL || "7d";
const DUMMY_PASSWORD_HASH = "$2b$12$1rkxgk8NzdgcVim.Aatc4e6MLxvndKLxOF2FmB2/B/2ig7qyDBmGK";
const cookieSameSite = process.env.COOKIE_SAME_SITE || "Lax";
const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" || cookieSameSite.toLowerCase() === "none",
    sameSite: cookieSameSite,
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000
};

const createToken = (user) => jwt.sign(
    { userId: user._id.toString() },
    process.env.JWT_SECRET,
    { expiresIn: TOKEN_LIFETIME, algorithm: "HS256" }
);

const todayUtc = () => new Date().toISOString().slice(0, 10);
const yesterdayUtc = () => new Date(Date.now() - 86400000).toISOString().slice(0, 10);
const validationError = (message) => ({ message });

function createAuthRouter({ UserModel = User, authenticate = authMiddleware } = {}) {
const router = express.Router();

router.post("/register", async (req, res) => {
    const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
    const email = normalizeEmail(req.body?.email);
    const password = req.body?.password;
    const message = validateRegistrationInput({ name, email, password });
    if (message) return res.status(400).json(validationError(message));

    try {
        const hashedPassword = await bcrypt.hash(password, 12);
        const user = await UserModel.create({
            name,
            email,
            password: hashedPassword,
            lastActiveDate: todayUtc(),
            streakCount: 1
        });

        res.cookie("taskflow_token", createToken(user), cookieOptions);
        return res.status(201).json({ message: "Account created successfully", user: formatUser(user) });
    } catch (error) {
        if (error.code === 11000) return res.status(409).json(validationError("An account with this email already exists"));
        if (error.name === "ValidationError") return res.status(400).json(validationError("Account details are invalid"));
        console.error("Registration failed:", error.message);
        return res.status(500).json(validationError("Unable to create the account right now"));
    }
});

router.post("/login", async (req, res) => {
    const email = normalizeEmail(req.body?.email);
    const password = req.body?.password;
    const message = validateLoginInput({ email, password });
    if (message) return res.status(400).json(validationError(message));

    try {
        const user = await UserModel.findOne({ email }).select("+password");
        const passwordMatches = await bcrypt.compare(
            password,
            user?.password || DUMMY_PASSWORD_HASH
        );
        if (!user || !passwordMatches) return res.status(401).json(validationError("Invalid email or password"));

        const today = todayUtc();
        let userChanged = false;
        if (user.lastActiveDate !== today) {
            user.streakCount = user.lastActiveDate === yesterdayUtc() ? (user.streakCount || 0) + 1 : 1;
            user.lastActiveDate = today;
            userChanged = true;
        }
        if (bcrypt.getRounds(user.password) < 12) {
            user.password = await bcrypt.hash(password, 12);
            userChanged = true;
        }
        if (userChanged) await user.save();

        res.cookie("taskflow_token", createToken(user), cookieOptions);
        return res.json({ message: "Login successful", user: formatUser(user) });
    } catch (error) {
        console.error("Login failed:", error.message);
        return res.status(500).json(validationError("Unable to log in right now"));
    }
});

router.get("/me", authenticate, async (req, res) => {
    try {
        const user = await UserModel.findById(req.user.userId);
        if (!user) return res.status(404).json(validationError("User not found"));
        return res.json(formatUser(user));
    } catch (error) {
        if (error.name === "CastError") return res.status(401).json(validationError("Invalid or expired token"));
        console.error("Profile lookup failed:", error.message);
        return res.status(500).json(validationError("Unable to fetch profile right now"));
    }
});

router.post("/logout", (req, res) => {
    res.clearCookie("taskflow_token", { ...cookieOptions, maxAge: undefined });
    return res.json({ message: "Signed out" });
});

return router;
}

const authRouter = createAuthRouter();
module.exports = authRouter;
module.exports.createAuthRouter = createAuthRouter;
