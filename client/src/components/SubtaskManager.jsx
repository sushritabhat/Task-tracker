import { useState } from "react";
import { Plus, X, CheckSquare, Square } from "lucide-react";

export default function SubtaskManager({ subtasks = [], onChangeSubtasks }) {
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");

  const handleAddSubtask = () => {
    if (!newSubtaskTitle.trim()) return;
    const updated = [...subtasks, { title: newSubtaskTitle.trim(), completed: false }];
    onChangeSubtasks(updated);
    setNewSubtaskTitle("");
  };

  const handleToggleSubtask = (index) => {
    const updated = subtasks.map((st, i) => (i === index ? { ...st, completed: !st.completed } : st));
    onChangeSubtasks(updated);
  };

  const handleDeleteSubtask = (index) => {
    const updated = subtasks.filter((_, i) => i !== index);
    onChangeSubtasks(updated);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddSubtask();
    }
  };

  const completedCount = subtasks.filter((st) => st.completed).length;

  return (
    <div className="subtask-manager">
      <div className="subtask-header">
        <label className="input-label">Checklist / Subtasks</label>
        {subtasks.length > 0 && (
          <span className="subtask-count">
            {completedCount} of {subtasks.length} done
          </span>
        )}
      </div>

      {subtasks.length > 0 && (
        <div className="subtask-progress-bar">
          <div
            className="subtask-progress-fill"
            style={{ width: `${(completedCount / subtasks.length) * 100}%` }}
          ></div>
        </div>
      )}

      <div className="subtask-list">
        {subtasks.map((st, idx) => (
          <div key={idx} className="subtask-item">
            <button
              type="button"
              className="subtask-toggle-btn"
              onClick={() => handleToggleSubtask(idx)}
            >
              {st.completed ? (
                <CheckSquare size={18} className="text-green" />
              ) : (
                <Square size={18} className="text-gray" />
              )}
            </button>
            <span className={`subtask-title ${st.completed ? "completed" : ""}`}>{st.title}</span>
            <button
              type="button"
              className="subtask-remove-btn"
              onClick={() => handleDeleteSubtask(idx)}
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>

      <div className="subtask-input-row">
        <input
          type="text"
          placeholder="Add subtask item..."
          value={newSubtaskTitle}
          onChange={(e) => setNewSubtaskTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          className="subtask-input"
        />
        <button type="button" className="subtask-add-btn" onClick={handleAddSubtask}>
          <Plus size={16} /> Add
        </button>
      </div>
    </div>
  );
}
