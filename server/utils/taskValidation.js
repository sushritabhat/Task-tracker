const priorities = new Set(["low", "medium", "high"]);
const statuses = new Set(["todo", "in-progress", "completed"]);
const categories = new Set(["Work", "Personal", "Study", "Fitness", "Code", "General"]);
const editableFields = new Set([
    "title", "description", "priority", "status", "completed", "category", "dueDate",
    "subtasks", "estimatedPomodoros", "completedPomodoros"
]);

const xpForPriority = (priority) => priority === "high" ? 30 : priority === "medium" ? 20 : 10;

function validateTaskFields(body, { partial = false } = {}) {
    if (!body || typeof body !== "object" || Array.isArray(body)) return "A task object is required";
    const unknown = Object.keys(body).find((key) => !editableFields.has(key));
    if (unknown) return `Unsupported task field: ${unknown}`;
    if (!partial && (typeof body.title !== "string" || !body.title.trim())) return "Task title is required";
    if (body.title !== undefined && (typeof body.title !== "string" || body.title.trim().length > 160 || !body.title.trim())) {
        return "Task title must be 1 to 160 characters";
    }
    if (body.description !== undefined && (typeof body.description !== "string" || body.description.length > 5000)) {
        return "Description must be 5000 characters or fewer";
    }
    if (body.priority !== undefined && !priorities.has(body.priority)) return "Priority must be low, medium, or high";
    if (body.status !== undefined && !statuses.has(body.status)) return "Status is invalid";
    if (body.completed !== undefined && typeof body.completed !== "boolean") return "Completed must be a boolean";
    if (body.status !== undefined && body.completed !== undefined && (body.status === "completed") !== body.completed) {
        return "Status and completion state must agree";
    }
    if (body.category !== undefined && !categories.has(body.category)) return "Category is invalid";
    if (body.dueDate !== undefined && body.dueDate !== null && body.dueDate !== "") {
        if (typeof body.dueDate !== "string" || !/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(body.dueDate) || Number.isNaN(Date.parse(body.dueDate))) {
            return "Due date must be a valid date";
        }
        const dateOnly = body.dueDate.slice(0, 10);
        const parsedDate = new Date(`${dateOnly}T00:00:00.000Z`).toISOString().slice(0, 10);
        if (parsedDate !== dateOnly) return "Due date must be a valid date";
    }
    if (body.subtasks !== undefined) {
        if (!Array.isArray(body.subtasks) || body.subtasks.length > 100) return "A task can have at most 100 subtasks";
        if (body.subtasks.some((item) => !item || typeof item.title !== "string" || !item.title.trim() || item.title.trim().length > 160 || (item.completed !== undefined && typeof item.completed !== "boolean"))) {
            return "Each subtask needs a title of 1 to 160 characters and an optional completion flag";
        }
    }
    for (const field of ["estimatedPomodoros", "completedPomodoros"]) {
        if (body[field] !== undefined && (!Number.isInteger(body[field]) || body[field] < 0 || body[field] > 1000)) {
            return `${field} must be a whole number between 0 and 1000`;
        }
    }
    return null;
}

function toUpdate(body) {
    const update = { ...body };
    if (update.title !== undefined) update.title = update.title.trim();
    if (update.dueDate === "") update.dueDate = null;
    if (update.status === "completed") update.completed = true;
    else if (update.status === "todo" || update.status === "in-progress") update.completed = false;
    if (update.completed === true) update.status = "completed";
    else if (update.completed === false && update.status === undefined) update.status = "todo";
    if (update.priority !== undefined) update.xpValue = xpForPriority(update.priority);
    return update;
}

module.exports = { validateTaskFields, toUpdate, xpForPriority };
