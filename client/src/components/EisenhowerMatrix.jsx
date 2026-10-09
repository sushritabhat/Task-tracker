import { AlertCircle, Calendar, Zap, Trash2, CheckCircle2 } from "lucide-react";

export default function EisenhowerMatrix({ tasks, onUpdateTaskStatus, onEditTask }) {
  const activeTasks = tasks.filter((t) => !t.completed);

  // Quadrant 1: Urgent & Important (High Priority)
  const q1 = activeTasks.filter((t) => t.priority === "high");

  // Quadrant 2: Not Urgent but Important (Medium Priority)
  const q2 = activeTasks.filter((t) => t.priority === "medium");

  // Quadrant 3: Urgent but Not Important (Low Priority with due date)
  const q3 = activeTasks.filter((t) => t.priority === "low" && t.dueDate);

  // Quadrant 4: Not Urgent & Not Important (Low Priority without due date)
  const q4 = activeTasks.filter((t) => t.priority === "low" && !t.dueDate);

  const renderTaskTile = (task) => (
    <div key={task._id} className="matrix-task-tile">
      <div className="matrix-tile-header">
        <span className="tile-title">{task.title}</span>
        <span className="category-pill">{task.category || "General"}</span>
      </div>
      {task.description && <p className="tile-desc">{task.description}</p>}
      <div className="tile-footer">
        <button className="matrix-complete-btn" onClick={() => onUpdateTaskStatus(task, "completed")}>
          <CheckCircle2 size={14} /> Done
        </button>
        <button className="matrix-edit-btn" onClick={() => onEditTask(task)}>
          Edit
        </button>
      </div>
    </div>
  );

  return (
    <div className="eisenhower-matrix-container">
      <div className="matrix-grid">
        {/* Quadrant 1 */}
        <div className="matrix-quadrant q1">
          <div className="quadrant-header">
            <AlertCircle size={20} className="q1-icon" />
            <div>
              <h3>DO FIRST</h3>
              <p>Urgent & Important (High Priority)</p>
            </div>
            <span className="quadrant-badge">{q1.length}</span>
          </div>
          <div className="quadrant-content">
            {q1.length === 0 ? <p className="quadrant-empty">No urgent high-priority tasks</p> : q1.map(renderTaskTile)}
          </div>
        </div>

        {/* Quadrant 2 */}
        <div className="matrix-quadrant q2">
          <div className="quadrant-header">
            <Calendar size={20} className="q2-icon" />
            <div>
              <h3>SCHEDULE</h3>
              <p>Important, Not Urgent (Medium Priority)</p>
            </div>
            <span className="quadrant-badge">{q2.length}</span>
          </div>
          <div className="quadrant-content">
            {q2.length === 0 ? <p className="quadrant-empty">No scheduled medium tasks</p> : q2.map(renderTaskTile)}
          </div>
        </div>

        {/* Quadrant 3 */}
        <div className="matrix-quadrant q3">
          <div className="quadrant-header">
            <Zap size={20} className="q3-icon" />
            <div>
              <h3>DELEGATE / QUICK WINS</h3>
              <p>Urgent, Less Important (Low Priority + Due Date)</p>
            </div>
            <span className="quadrant-badge">{q3.length}</span>
          </div>
          <div className="quadrant-content">
            {q3.length === 0 ? <p className="quadrant-empty">No quick win tasks</p> : q3.map(renderTaskTile)}
          </div>
        </div>

        {/* Quadrant 4 */}
        <div className="matrix-quadrant q4">
          <div className="quadrant-header">
            <Trash2 size={20} className="q4-icon" />
            <div>
              <h3>DONT DO / BACKLOG</h3>
              <p>Not Urgent, Low Priority</p>
            </div>
            <span className="quadrant-badge">{q4.length}</span>
          </div>
          <div className="quadrant-content">
            {q4.length === 0 ? <p className="quadrant-empty">No backlog tasks</p> : q4.map(renderTaskTile)}
          </div>
        </div>
      </div>
    </div>
  );
}
