const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(email) {
    return typeof email === "string" ? email.trim().toLowerCase() : "";
}

function validateRegistrationInput({ name, email, password } = {}) {
    const safeName = typeof name === "string" ? name.trim() : "";
    const safeEmail = normalizeEmail(email);

    if (safeName.length < 2 || safeName.length > 80) return "Name must be 2 to 80 characters long";
    if (safeEmail.length > 254 || !EMAIL_PATTERN.test(safeEmail)) return "Enter a valid email address";
    if (typeof password !== "string" || password.length < 10 || Buffer.byteLength(password, "utf8") > 72) {
        return "Password must be at least 10 characters and no more than 72 UTF-8 bytes";
    }
    return null;
}

function validateLoginInput({ email, password } = {}) {
    const safeEmail = normalizeEmail(email);
    if (safeEmail.length > 254 || !EMAIL_PATTERN.test(safeEmail) || typeof password !== "string" || password.length > 128) {
        return "Email and password are required";
    }
    return null;
}

module.exports = { normalizeEmail, validateRegistrationInput, validateLoginInput };
