const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema(
    {
        // The user who owns this task
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        title: {
            type: String,
            required: true,
            trim: true,
            minlength: 1,
            maxlength: 160
        },

        description: {
            type: String,
            default: "",
            maxlength: 5000
        },
        priority: {
            type: String,
            enum: ["low", "medium", "high"],
            default: "medium"
        },
        status: {
            type: String,
            enum: ["todo", "in-progress", "completed"],
            default: "todo"
        },
        category: {
            type: String,
            enum: ["Work", "Personal", "Study", "Fitness", "Code", "General"],
            default: "General"
        },
        subtasks: [
            {
                _id: false,
                title: { type: String, required: true },
                completed: { type: Boolean, default: false }
            }
        ],
        dueDate: {
            type: Date
        },
        xpValue: {
            type: Number,
            default: 20,
            min: 0
        },
        estimatedPomodoros: {
            type: Number,
            default: 1,
            min: 0,
            max: 1000
        },
        completedPomodoros: {
            type: Number,
            default: 0,
            min: 0,
            max: 1000
        },
        completed: {
            type: Boolean,
            default: false
        },
        xpAwarded: {
            type: Boolean,
            default: false
        }
    },
    {
        timestamps: true
    }
);

taskSchema.index({ userId: 1, createdAt: -1 });

const Task = mongoose.model("Task", taskSchema);

module.exports = Task;
