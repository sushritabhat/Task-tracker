const test = require("node:test");
const assert = require("node:assert/strict");

const { validateTaskFields, toUpdate, xpForPriority } = require("../utils/taskValidation");
const { normalizeEmail, validateRegistrationInput, validateLoginInput } = require("../utils/authValidation");

test("accepts a valid task and normalizes its values", () => {
    const task = {
        title: "  Finish project  ",
        priority: "high",
        category: "Work",
        dueDate: "2026-10-08",
        subtasks: [{ title: "  Outline  ", completed: false }]
    };

    assert.equal(validateTaskFields(task), null);
    assert.equal(toUpdate(task).title, "Finish project");
    assert.equal(toUpdate(task).xpValue, 30);
});

test("rejects missing, blank, and overlong task titles", () => {
    assert.equal(validateTaskFields({}), "Task title is required");
    assert.match(validateTaskFields({ title: "   " }), /title/i);
    assert.match(validateTaskFields({ title: "x".repeat(161) }), /160/);
});

test("rejects unknown and server-owned fields", () => {
    assert.match(validateTaskFields({ title: "Task", userId: "attacker" }), /Unsupported task field/);
    assert.match(validateTaskFields({ title: "Task", xpAwarded: true }), /Unsupported task field/);
    assert.match(validateTaskFields({ title: "Task", xpValue: 100000 }), /Unsupported task field/);
});

test("validates task enums, descriptions, dates, checklists, and estimates", () => {
    assert.match(validateTaskFields({ title: "Task", priority: "urgent" }), /Priority/);
    assert.match(validateTaskFields({ title: "Task", category: "Other" }), /Category/);
    assert.match(validateTaskFields({ title: "Task", dueDate: "2026-02-30" }), /date/i);
    assert.match(validateTaskFields({ title: "Task", subtasks: Array(101).fill({ title: "Subtask" }) }), /100 subtasks/);
    assert.match(validateTaskFields({ title: "Task", subtasks: [{ title: " " }] }), /subtask/i);
    assert.match(validateTaskFields({ title: "Task", estimatedPomodoros: 1.5 }), /whole number/);
    assert.match(validateTaskFields({ title: "Task", completedPomodoros: 1001 }), /whole number/);
    assert.match(validateTaskFields({ title: "Task", description: "x".repeat(5001) }), /5000/);
});

test("requires task status and completion state to agree", () => {
    assert.match(validateTaskFields({ status: "completed", completed: false }, { partial: true }), /agree/);
    assert.match(validateTaskFields({ status: "in-progress", completed: true }, { partial: true }), /agree/);
    assert.equal(validateTaskFields({ status: "in-progress", completed: false }, { partial: true }), null);
});

test("converts task state updates consistently", () => {
    assert.deepEqual(toUpdate({ status: "completed" }), { status: "completed", completed: true });
    assert.deepEqual(toUpdate({ status: "in-progress" }), { status: "in-progress", completed: false });
    assert.deepEqual(toUpdate({ completed: false }), { completed: false, status: "todo" });
    assert.deepEqual(toUpdate({ dueDate: "" }), { dueDate: null });
});

test("maps priority to its fixed XP value", () => {
    assert.equal(xpForPriority("low"), 10);
    assert.equal(xpForPriority("medium"), 20);
    assert.equal(xpForPriority("high"), 30);
    assert.equal(xpForPriority("unexpected"), 10);
});

test("normalizes emails and validates registration input", () => {
    assert.equal(normalizeEmail("  PERSON@EXAMPLE.COM "), "person@example.com");
    assert.equal(validateRegistrationInput({ name: "Ada", email: "ada@example.com", password: "correct horse battery" }), null);
    assert.match(validateRegistrationInput({ name: "A", email: "ada@example.com", password: "correct horse battery" }), /Name/);
    assert.match(validateRegistrationInput({ name: "Ada", email: "invalid", password: "correct horse battery" }), /email/i);
    assert.match(validateRegistrationInput({ name: "Ada", email: "ada@example.com", password: "short" }), /Password/);
    assert.match(validateRegistrationInput({ name: "Ada", email: "ada@example.com", password: "😀".repeat(19) }), /72 UTF-8 bytes/);
});

test("rejects malformed login input", () => {
    assert.equal(validateLoginInput({ email: "ada@example.com", password: "password" }), null);
    assert.match(validateLoginInput({ email: "bad", password: "password" }), /required/);
    assert.match(validateLoginInput({ email: "ada@example.com", password: "x".repeat(129) }), /required/);
});
