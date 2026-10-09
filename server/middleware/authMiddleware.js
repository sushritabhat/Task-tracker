const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
    const cookieHeader = req.headers.cookie || "";
    const sessionCookie = cookieHeader.split(";").map((value) => value.trim()).find((value) => value.startsWith("taskflow_token="));
    const cookieToken = sessionCookie ? sessionCookie.slice("taskflow_token=".length) : "";
    const [scheme, bearerToken, ...extra] = (req.headers.authorization || "").split(" ");
    if (!cookieToken && (scheme !== "Bearer" || !bearerToken || extra.length)) {
        return res.status(401).json({ message: "Sign in to continue" });
    }
    const token = cookieToken || bearerToken;

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ["HS256"] });
        if (typeof decoded !== "object" || !decoded.userId) {
            return res.status(401).json({ message: "Invalid or expired token" });
        }
        req.user = { userId: decoded.userId };
        return next();
    } catch {
        return res.status(401).json({ message: "Invalid or expired token" });
    }
};

module.exports = authMiddleware;
