const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");

process.env.JWT_SECRET = "taskflow-integration-test-secret-at-least-32-characters";
const authMiddleware = require("../middleware/authMiddleware");
const { createTaskRouter } = require("../routes/taskRoutes");

function makeTaskModel() {
    const records = new Map();
    const matches = (record, filter) => record && record._id === String(filter._id) && record.userId === String(filter.userId);
    const serialize = (record) => record ? { ...record, toObject: () => ({ ...record }) } : null;

    return {
        records,
        async create(data) {
            const record = {
                ...data,
                _id: new mongoose.Types.ObjectId().toString(),
                xpAwarded: false,
                createdAt: new Date().toISOString()
            };
            records.set(record._id, record);
            return serialize(record);
        },
        find(filter) {
            let limit = 500;
            const query = {
                sort() { return this; },
                limit(value) { limit = value; return this; },
                lean: async () => [...records.values()]
                    .filter((record) => record.userId === String(filter.userId))
                    .slice(0, limit)
                    .map((record) => ({ ...record }))
            };
            return query;
        },
        findOne(filter) {
            const record = records.get(String(filter._id));
            return { select: async () => matches(record, filter) ? { completed: record.completed } : null };
        },
        async findOneAndUpdate(filter, update) {
            const record = records.get(String(filter._id));
            if (!matches(record, filter)) return null;
            if (Object.hasOwn(filter, "xpAwarded") && (record.xpAwarded || !record.completed)) return null;
            Object.assign(record, update.$set);
            return serialize(record);
        },
        async updateOne(filter, update) {
            const record = records.get(String(filter._id));
            if (matches(record, filter)) Object.assign(record, update.$set);
        },
        async findOneAndDelete(filter) {
            const record = records.get(String(filter._id));
            if (!matches(record, filter)) return null;
            records.delete(record._id);
            return serialize(record);
        }
    };
}

function makeUserModel(userId) {
    const user = { _id: userId, name: "Test User", email: "test@example.com", xp: 0, level: 1, streakCount: 1, badges: ["Starter"] };
    return {
        user,
        async findOneAndUpdate(_filter, pipeline) {
            const xpGained = pipeline[0].$set.xp.$add[1];
            user.xp += xpGained;
            user.level = Math.floor(user.xp / 100) + 1;
            if (user.level >= 2 && !user.badges.includes("Level 2 Warrior")) user.badges.push("Level 2 Warrior");
            if (user.level >= 5 && !user.badges.includes("Productivity Pro")) user.badges.push("Productivity Pro");
            if (user.level >= 10 && !user.badges.includes("Task Master")) user.badges.push("Task Master");
            return { ...user };
        }
    };
}

test("task API authenticates users, enforces ownership, and awards completion XP once", async (t) => {
    const ownerId = new mongoose.Types.ObjectId().toString();
    const otherId = new mongoose.Types.ObjectId().toString();
    const taskModel = makeTaskModel();
    const userModel = makeUserModel(ownerId);
    const app = express();
    app.use(express.json());
    app.use("/api/tasks", createTaskRouter({ TaskModel: taskModel, UserModel: userModel }));
    const server = app.listen(0, "127.0.0.1");
    await new Promise((resolve) => server.once("listening", resolve));
    t.after(() => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())));

    const baseUrl = `http://127.0.0.1:${server.address().port}/api/tasks`;
    const ownerToken = jwt.sign({ userId: ownerId }, process.env.JWT_SECRET, { expiresIn: "1h" });
    const otherToken = jwt.sign({ userId: otherId }, process.env.JWT_SECRET, { expiresIn: "1h" });
    const request = (url, { token, ...options } = {}) => fetch(url, {
        ...options,
        headers: {
            ...(options.body ? { "Content-Type": "application/json" } : {}),
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...options.headers
        }
    });

    const unauthenticated = await request(baseUrl);
    assert.equal(unauthenticated.status, 401);

    const rejected = await request(baseUrl, {
        token: ownerToken,
        method: "POST",
        body: JSON.stringify({ title: "Work item", userId: otherId })
    });
    assert.equal(rejected.status, 400);
    assert.equal(taskModel.records.size, 0);

    const createdResponse = await request(baseUrl, {
        token: ownerToken,
        method: "POST",
        body: JSON.stringify({ title: "  Ship release  ", priority: "high" })
    });
    assert.equal(createdResponse.status, 201);
    const created = await createdResponse.json();
    assert.equal(created.title, "Ship release");
    assert.equal(created.userId, ownerId);
    assert.equal(created.xpValue, 30);
    assert.equal(created.status, "todo");

    const forbiddenUpdate = await request(`${baseUrl}/${created._id}`, {
        token: otherToken,
        method: "PUT",
        body: JSON.stringify({ title: "Steal task" })
    });
    assert.equal(forbiddenUpdate.status, 404);

    const completedResponse = await request(`${baseUrl}/${created._id}`, {
        token: ownerToken,
        method: "PUT",
        body: JSON.stringify({ status: "completed", completed: true })
    });
    assert.equal(completedResponse.status, 200);
    const completed = await completedResponse.json();
    assert.equal(completed.xpAwardedNow, true);
    assert.equal(completed.user.xp, 30);
    assert.equal(userModel.user.xp, 30);

    const editCompleted = await request(`${baseUrl}/${created._id}`, {
        token: ownerToken,
        method: "PUT",
        body: JSON.stringify({ title: "Renamed completed task" })
    });
    assert.equal((await editCompleted.json()).xpAwardedNow, false);
    assert.equal(userModel.user.xp, 30);

    await request(`${baseUrl}/${created._id}`, {
        token: ownerToken,
        method: "PUT",
        body: JSON.stringify({ status: "todo", completed: false })
    });
    const completedAgain = await request(`${baseUrl}/${created._id}`, {
        token: ownerToken,
        method: "PUT",
        body: JSON.stringify({ status: "completed", completed: true })
    });
    assert.equal((await completedAgain.json()).xpAwardedNow, false);
    assert.equal(userModel.user.xp, 30);
});

