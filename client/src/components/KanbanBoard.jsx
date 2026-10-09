import { CheckCircle2, Clock, PlayCircle, Star, Calendar, Trash2, Edit3 } from "lucide-react";

export default function KanbanBoard({ tasks, onUpdateTaskStatus, onEditTask, onDeleteTask, onStartFocus }) {
  const todoTasks = tasks.filter((t) => !t.completed && (t.status === "todo" || !t.status));
  const inProgressTasks = tasks.filter((t) => !t.completed && t.status === "in-progress");
  const completedTasks = tasks.filter((t) => t.completed || t.status === "completed");

  const renderTaskCard = (task) => {
    const subtaskDoneCount = task.subtasks ? task.subtasks.filter((st) => st.completed).length : 0;
    const subtaskTotalCount = task.subtasks ? task.subtasks.length : 0;

    return (
      <div key={task._id} className={`kanban-card priority-${task.priority || "medium"}`}>
        <div className="kanban-card-header">
          <span className={`category-tag cat-${(task.category || "General").toLowerCase()}`}>
            {task.category || "General"}
          </span>
          <span className="xp-pill">
            <Star size={12} fill="#eab308" color="#eab308" /> +{task.xpValue || 20} XP
          </span>
        </div>

        <h4 className={`kanban-card-title ${task.completed ? "line-through" : ""}`}>{task.title}</h4>

        {task.description && <p className="kanban-card-desc">{task.description}</p>}

        {subtaskTotalCount > 0 && (
          <div className="subtask-mini-progress">
            <div className="subtask-mini-bar">
              <div
                className="subtask-mini-fill"
                style={{ width: `${(subtaskDoneCount / subtaskTotalCount) * 100}%` }}
              ></div>
            </div>
            <span>
              {subtaskDoneCount}/{subtaskTotalCount} Subtasks
            </span>
          </div>
        )}

        <div className="kanban-card-meta">
          {task.dueDate && (
            <span className="due-date-pill">
              <Calendar size={12} /> {new Date(task.dueDate).toLocaleDateString()}
            </span>
          )}
          <span className={`priority-badge ${task.priority || "medium"}`}>
            {(task.priority || "medium").toUpperCase()}
          </span>
        </div>

        <div className="kanban-card-actions">
          {task.status !== "todo" && !task.completed && (
            <button
              className="kanban-move-btn"
              onClick={() => onUpdateTaskStatus(task, "todo")}
              title="Move to To Do"
            >
              ← To Do
            </button>
          )}

          {task.status !== "in-progress" && !task.completed && (
            <button
              className="kanban-move-btn highlight"
              onClick={() => onUpdateTaskStatus(task, "in-progress")}
              title="Move to In Progress"
            >
              ⚡ In Progress
            </button>
          )}

          {!task.completed ? (
            <button
              className="kanban-move-btn success"
              onClick={() => onUpdateTaskStatus(task, "completed")}
              title="Mark Completed"
            >
              ✅ Complete
            </button>
          ) : (
            <button
              className="kanban-move-btn"
              onClick={() => onUpdateTaskStatus(task, "todo")}
              title="Re-open Task"
            >
              ↩ Re-open
            </button>
          )}

          <div className="icon-actions">
            {!task.completed && (
              <button className="icon-btn" onClick={() => onStartFocus(task)} title="Focus in Pomodoro">
                <PlayCircle size={16} />
              </button>
            )}
            <button className="icon-btn" onClick={() => onEditTask(task)} title="Edit Task">
              <Edit3 size={16} />
            </button>
            <button className="icon-btn danger" onClick={() => onDeleteTask(task._id)} title="Delete Task">
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="kanban-board-container">
      {/* Column 1: TO DO */}
      <div className="kanban-column column-todo">
        <div className="kanban-column-header">
          <div className="col-title">
            <Clock size={18} className="text-orange" />
            <h3>To Do</h3>
          </div>
          <span className="col-count">{todoTasks.length}</span>
        </div>
        <div className="kanban-column-body">
          {todoTasks.length === 0 ? <div className="kanban-empty">No tasks in queue</div> : todoTasks.map(renderTaskCard)}
        </div>
      </div>

      {/* Column 2: IN PROGRESS */}
      <div className="kanban-column column-progress">
        <div className="kanban-column-header">
          <div className="col-title">
            <PlayCircle size={18} className="text-blue" />
            <h3>In Progress</h3>
          </div>
          <span className="col-count">{inProgressTasks.length}</span>
        </div>
        <div className="kanban-column-body">
          {inProgressTasks.length === 0 ? <div className="kanban-empty">No active tasks</div> : inProgressTasks.map(renderTaskCard)}
        </div>
      </div>

      {/* Column 3: COMPLETED */}
      <div className="kanban-column column-done">
        <div className="kanban-column-header">
          <div className="col-title">
            <CheckCircle2 size={18} className="text-green" />
            <h3>Completed</h3>
          </div>
          <span className="col-count">{completedTasks.length}</span>
        </div>
        <div className="kanban-column-body">
          {completedTasks.length === 0 ? <div className="kanban-empty">No completed tasks yet</div> : completedTasks.map(renderTaskCard)}
        </div>
      </div>
    </div>
  );
}
