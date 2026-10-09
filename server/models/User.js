const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            minlength: 2,
            maxlength: 80
        },

        email: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true,
            maxlength: 254
        },

        password: {
            type: String,
            required: true,
            select: false
        },

        xp: {
            type: Number,
            default: 0,
            min: 0
        },

        level: {
            type: Number,
            default: 1,
            min: 1
        },

        streakCount: {
            type: Number,
            default: 0,
            min: 0
        },

        lastActiveDate: {
            type: String,
            default: ""
        },

        badges: {
            type: [String],
            default: ["Starter"]
        }
    },
    {
        timestamps: true
    }
);

const User = mongoose.model("User", userSchema);

module.exports = User;
