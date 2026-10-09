const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

process.env.JWT_SECRET = "taskflow-auth-test-secret-at-least-32-characters";
const authMiddleware = require("../middleware/authMiddleware");
const { createAuthRouter } = require("../routes/authRoutes");

function makeUserModel() {
    const users = new Map();
    return {
        async create(data) {
            if ([...users.values()].some((user) => user.email === data.email)) {
                const error = new Error("Duplicate email");
                error.code = 11000;
                throw error;
            }
            const user = {
                ...data,
                _id: new mongoose.Types.ObjectId(),
                xp: 0,
                level: 1,
                badges: ["Starter"],
                async save() { return this; }
            };
            users.set(user._id.toString(), user);
            return user;
        },
        findOne({ email }) {
            const user = [...users.values()].find((candidate) => candidate.email === email) || null;
            return { select: async () => user };
        },
        async findById(id) {
            return users.get(String(id)) || null;
        }
    };
}

test("auth API validates credentials and manages HttpOnly sessions", async (t) => {
    const userModel = makeUserModel();
    const app = express();
    app.use(express.json());
    app.use("/api/auth", createAuthRouter({ UserModel: userModel, authenticate: authMiddleware }));
    const server = app.listen(0, "127.0.0.1");
    await new Promise((resolve) => server.once("listening", resolve));
    t.after(() => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())));

    const baseUrl = `http://127.0.0.1:${server.address().port}/api/auth`;
    const sendJson = (url, body) => fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
    });

    const invalidRegistration = await sendJson(`${baseUrl}/register`, {
        name: "A",
        email: "person@example.com",
        password: "long enough password"
    });
    assert.equal(invalidRegistration.status, 400);

    const registration = await sendJson(`${baseUrl}/register`, {
        name: "Test Person",
        email: "  PERSON@EXAMPLE.COM ",
        password: "long enough password"
    });
    assert.equal(registration.status, 201);
    const registrationBody = await registration.json();
    assert.equal(registrationBody.user.email, "person@example.com");
    assert.equal(Object.hasOwn(registrationBody, "token"), false);
    assert.equal(Object.hasOwn(registrationBody.user, "password"), false);
    const registrationCookie = registration.headers.get("set-cookie");
    assert.match(registrationCookie, /HttpOnly/i);
    assert.match(registrationCookie, /SameSite=Lax/i);

    const wrongPassword = await sendJson(`${baseUrl}/login`, {
        email: "person@example.com",
        password: "wrong password"
    });
    assert.equal(wrongPassword.status, 401);
    assert.deepEqual(await wrongPassword.json(), { message: "Invalid email or password" });

    const login = await sendJson(`${baseUrl}/login`, {
        email: "PERSON@example.com",
        password: "long enough password"
    });
    assert.equal(login.status, 200);
    const loginCookie = login.headers.get("set-cookie");
    assert.match(loginCookie, /HttpOnly/i);

    const profile = await fetch(`${baseUrl}/me`, {
        headers: { Cookie: loginCookie.split(";")[0] }
    });
    assert.equal(profile.status, 200);
    assert.equal((await profile.json()).email, "person@example.com");

    const logout = await sendJson(`${baseUrl}/logout`, {});
    assert.equal(logout.status, 200);
    assert.match(logout.headers.get("set-cookie"), /Expires=Thu, 01 Jan 1970/i);
});
