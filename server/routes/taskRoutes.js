const express = require("express");
const mongoose = require("mongoose");
const Task = require("../models/Task");
const User = require("../models/User");
const authMiddleware = require("../middleware/authMiddleware");
const formatUser = require("../utils/formatUser");
const { validateTaskFields, toUpdate, xpForPriority } = require("../utils/taskValidation");

const invalid = (res, message) => res.status(400).json({ message });

async function applyCompletionReward(task, userId, TaskModel, UserModel) {
    const claimedTask = await TaskModel.findOneAndUpdate(
        { _id: task._id, userId, completed: true, xpAwarded: { $ne: true } },
        { $set: { xpAwarded: true } },
        { returnDocument: "after" }
    );
    if (!claimedTask) return { xpAwardedNow: false };

    let user;
    try {
        user = await UserModel.findOneAndUpdate(
            { _id: userId },
            [
                {
                    $set: {
                        xp: { $add: [{ $ifNull: ["$xp", 0] }, claimedTask.xpValue] }
                    }
                },
                {
                    $set: {
                        level: { $add: [{ $floor: { $divide: ["$xp", 100] } }, 1] },
                        badges: {
                            $setUnion: [
                                { $ifNull: ["$badges", ["Starter"]] },
                                { $cond: [{ $gte: ["$xp", 100] }, ["Level 2 Warrior"], []] },
                                { $cond: [{ $gte: ["$xp", 400] }, ["Productivity Pro"], []] },
                                { $cond: [{ $gte: ["$xp", 900] }, ["Task Master"], []] },
                                { $cond: [{ $gte: [{ $ifNull: ["$streakCount", 0] }, 3] }, ["Streak Starter"], []] },
                                { $cond: [{ $gte: [{ $ifNull: ["$streakCount", 0] }, 7] }, ["Weekly Legend"], []] }
                            ]
                        }
                    }
                }
            ],
            { returnDocument: "after" }
        );
    } catch (error) {
        await TaskModel.updateOne({ _id: task._id, userId }, { $set: { xpAwarded: false } });
        throw error;
    }
    if (!user) {
        await TaskModel.updateOne({ _id: task._id, userId }, { $set: { xpAwarded: false } });
        throw new Error("Task owner no longer exists");
    }
    const previousLevel = Math.floor(((user.xp || 0) - claimedTask.xpValue) / 100) + 1;
    return { xpAwardedNow: true, user: formatUser(user), leveledUp: user.level > previousLevel };
}

function createTaskRouter({ TaskModel = Task, UserModel = User, authenticate = authMiddleware } = {}) {
    const router = express.Router();
    router.use(authenticate);

router.post("/", async (req, res) => {
    const validationMessage = validateTaskFields(req.body);
    if (validationMessage) return invalid(res, validationMessage);

    try {
        const data = toUpdate(req.body);
        const task = await TaskModel.create({
            userId: req.user.userId,
            ...data,
            status: "todo",
            completed: false,
            xpValue: xpForPriority(data.priority || "medium")
        });
        return res.status(201).json(task);
    } catch (error) {
        if (error.name === "ValidationError" || error.name === "CastError") return invalid(res, "Task details are invalid");
        console.error("Task creation failed:", error.message);
        return res.status(500).json({ message: "Unable to create task right now" });
    }
});

router.get("/", async (req, res) => {
    const parsedLimit = Number.parseInt(req.query.limit, 10);
    const limit = Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 500) : 500;
    try {
        const tasks = await TaskModel.find({ userId: req.user.userId }).sort({ createdAt: -1 }).limit(limit).lean();
        return res.json(tasks);
    } catch (error) {
        console.error("Task fetch failed:", error.message);
        return res.status(500).json({ message: "Unable to fetch tasks right now" });
    }
});

router.put("/:id", async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) return invalid(res, "Task ID is invalid");
    const validationMessage = validateTaskFields(req.body, { partial: true });
    if (validationMessage) return invalid(res, validationMessage);
    if (Object.keys(req.body).length === 0) return invalid(res, "At least one task field is required");

    try {
        const previousTask = await TaskModel.findOne({ _id: req.params.id, userId: req.user.userId }).select("completed");
        if (!previousTask) return res.status(404).json({ message: "Task not found" });
        const task = await TaskModel.findOneAndUpdate(
            { _id: req.params.id, userId: req.user.userId },
            { $set: toUpdate(req.body) },
            { returnDocument: "after", runValidators: true }
        );
        if (!task) return res.status(404).json({ message: "Task not found" });

        const justCompleted = !previousTask.completed && task.completed;
        const reward = justCompleted ? await applyCompletionReward(task, req.user.userId, TaskModel, UserModel) : { xpAwardedNow: false };
        return res.json({ ...task.toObject(), xpAwarded: task.xpAwarded || reward.xpAwardedNow, ...reward });
    } catch (error) {
        if (error.name === "ValidationError" || error.name === "CastError") return invalid(res, "Task details are invalid");
        console.error("Task update failed:", error.message);
        return res.status(500).json({ message: "Unable to update task right now" });
    }
});

router.delete("/:id", async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) return invalid(res, "Task ID is invalid");
    try {
        const task = await TaskModel.findOneAndDelete({ _id: req.params.id, userId: req.user.userId });
        if (!task) return res.status(404).json({ message: "Task not found" });
        return res.json({ message: "Task deleted successfully" });
    } catch (error) {
        console.error("Task delete failed:", error.message);
        return res.status(500).json({ message: "Unable to delete task right now" });
    }
});
    return router;
}

const taskRouter = createTaskRouter();
module.exports = taskRouter;
module.exports.createTaskRouter = createTaskRouter;
