import { useEffect, useState } from "react";
import api from "./api";
import confetti from "canvas-confetti";
import {
  List,
  Kanban,
  Grid,
  Clock,
  BarChart3,
  Flame,
  Star,
  LogOut,
  Plus,
  Search,
  CheckCircle2,
  Calendar,
  Sparkles,
  Volume2,
  VolumeX,
  Palette,
  Edit3,
  Trash2
} from "lucide-react";

import Login from "./Login";
import Register from "./Register";
import KanbanBoard from "./components/KanbanBoard";
import EisenhowerMatrix from "./components/EisenhowerMatrix";
import FocusTimer from "./components/FocusTimer";
import SubtaskManager from "./components/SubtaskManager";
import AnalyticsView from "./components/AnalyticsView";

import { audioEngine } from "./utils/audio";
import "./App.css";

function readSavedUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    localStorage.removeItem("user");
    return null;
  }
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => Boolean(readSavedUser()));
  const [showRegister, setShowRegister] = useState(false);
  const [user, setUser] = useState(readSavedUser);

  // Navigation View: 'list' | 'kanban' | 'eisenhower' | 'focus' | 'analytics'
  const [currentView, setCurrentView] = useState("kanban");

  // Theme: 'dark' | 'zen' | 'sunset' | 'emerald'
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "dark");
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [category, setCategory] = useState("General");
  const [dueDate, setDueDate] = useState("");
  const [subtasks, setSubtasks] = useState([]);
  const [estimatedPomodoros, setEstimatedPomodoros] = useState(1);
  const [editingTaskId, setEditingTaskId] = useState(null);

  // Focus Timer active task
  const [activeFocusTask, setActiveFocusTask] = useState(null);

  // Task list & filters
  const [tasks, setTasks] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  // Apply theme class to body
  useEffect(() => {
    document.body.className = `theme-${theme}`;
    localStorage.setItem("theme", theme);
  }, [theme]);

  // Logout
  const logoutUser = async () => {
    try {
      await api.post("/auth/logout");
    } catch (error) {
      console.error("Sign-out request failed", error);
    }
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setIsAuthenticated(false);
    setUser(null);
    setTasks([]);
  };

  const acceptAuthentication = (authData) => {
    if (authData.token) localStorage.setItem("token", authData.token);
    else localStorage.removeItem("token");
    localStorage.setItem("user", JSON.stringify(authData.user));
    setIsAuthenticated(true);
    setUser(authData.user);
  };

  useEffect(() => {
    if (!isAuthenticated) return;

    let isActive = true;

    const loadDashboard = async () => {
      try {
        const [taskResponse, profileResponse] = await Promise.all([
          api.get("/tasks"),
          api.get("/auth/me")
        ]);

        if (!isActive) return;
        setTasks(taskResponse.data);
        setUser(profileResponse.data);
        localStorage.setItem("user", JSON.stringify(profileResponse.data));
      } catch (err) {
        console.error("Failed to load dashboard", err);
        if (err.response?.status === 401) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          setIsAuthenticated(false);
          setUser(null);
          setTasks([]);
        }
      }
    };

    void loadDashboard();
    return () => {
      isActive = false;
    };
  }, [isAuthenticated]);

  const applyUpdatedTask = (response, taskId) => {
    const { user: updatedUser, ...updatedTask } = response.data;
    setTasks((currentTasks) => currentTasks.map((task) => task._id === taskId ? updatedTask : task));

    if (!response.data.xpAwardedNow) return;
    if (updatedUser) {
      setUser(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));
    }
    if (soundEnabled) audioEngine.playCompletionSound();
    confetti({ particleCount: 50, spread: 60, origin: { y: 0.8 } });
    if (response.data.leveledUp) {
      if (soundEnabled) audioEngine.playLevelUpSound();
      alert(`Level up! You reached level ${updatedUser.level}.`);
    }
  };

  // Add Task
  const addTask = async () => {
    if (!title.trim()) {
      alert("Please enter a task title");
      return;
    }

    try {
      const response = await api.post(
        "/tasks",
        {
          title,
          description,
          priority,
          category,
          dueDate,
          subtasks,
          estimatedPomodoros
        }
      );

      setTasks((currentTasks) => [response.data, ...currentTasks]);
      resetForm();

    } catch (error) {
      alert(error.response?.data?.message || "Failed to add task");
    }
  };

  // Edit Task start
  const startEditing = (task) => {
    setEditingTaskId(task._id);
    setTitle(task.title);
    setDescription(task.description || "");
    setPriority(task.priority || "medium");
    setCategory(task.category || "General");
    setSubtasks(task.subtasks || []);
    setEstimatedPomodoros(task.estimatedPomodoros || 1);
    setDueDate(task.dueDate ? task.dueDate.split("T")[0] : "");

    // Scroll to form smoothly
    const formElement = document.getElementById("task-form-section");
    if (formElement) formElement.scrollIntoView({ behavior: "smooth" });
  };

  // Update Task
  const updateTask = async () => {
    if (!title.trim()) {
      alert("Please enter a task title");
      return;
    }

    try {
      const response = await api.put(
        `/tasks/${editingTaskId}`,
        {
          title,
          description,
          priority,
          category,
          dueDate,
          subtasks,
          estimatedPomodoros
        }
      );

      setTasks((currentTasks) => currentTasks.map((task) => task._id === editingTaskId ? response.data : task));
      resetForm();

    } catch (error) {
      alert(error.response?.data?.message || "Failed to update task");
    }
  };

  // Update Task Status (Kanban / Drag / Actions)
  const updateTaskStatus = async (task, newStatus) => {
    const isNowCompleted = newStatus === "completed";
    try {
      const response = await api.put(
        `/tasks/${task._id}`,
        {
          status: newStatus,
          completed: isNowCompleted
        }
      );

      applyUpdatedTask(response, task._id);
    } catch (error) {
      alert(error.response?.data?.message || "Failed to update status");
    }
  };

  // Toggle Task Completion
  const toggleTask = async (task) => {
    const nextCompleted = !task.completed;
    const nextStatus = nextCompleted ? "completed" : "todo";

    try {
      const response = await api.put(
        `/tasks/${task._id}`,
        {
          completed: nextCompleted,
          status: nextStatus
        }
      );

      applyUpdatedTask(response, task._id);
    } catch (error) {
      alert(error.response?.data?.message || "Failed to update task");
    }
  };

  // Delete Task
  const deleteTask = async (id) => {
    if (!window.confirm("Are you sure you want to delete this task?")) return;
    try {
      await api.delete(`/tasks/${id}`);
      setTasks((currentTasks) => currentTasks.filter((task) => task._id !== id));
    } catch (error) {
      alert(error.response?.data?.message || "Failed to delete task");
    }
  };

  // Reset form
  const resetForm = () => {
    setTitle("");
    setDescription("");
    setPriority("medium");
    setCategory("General");
    setDueDate("");
    setSubtasks([]);
    setEstimatedPomodoros(1);
    setEditingTaskId(null);
  };

  // AI Task Breakdown preset helper
  const applyMagicBreakdown = () => {
    if (!title.trim()) {
      alert("Please enter a title first, e.g. 'Build Landing Page' or 'Prepare for Presentation'");
      return;
    }
    const lower = title.toLowerCase();
    let generated = [
      { title: "Research & outline key requirements", completed: false },
      { title: "Draft initial design / solution", completed: false },
      { title: "Review and refine deliverables", completed: false }
    ];

    if (lower.includes("page") || lower.includes("website") || lower.includes("app") || lower.includes("code")) {
      generated = [
        { title: "Set up component architecture", completed: false },
        { title: "Build responsive layout & UI components", completed: false },
        { title: "Integrate APIs and state management", completed: false },
        { title: "Run end-to-end testing & fix bugs", completed: false }
      ];
    } else if (lower.includes("present") || lower.includes("report") || lower.includes("ppt")) {
      generated = [
        { title: "Gather key data & evidence", completed: false },
        { title: "Create slide deck visual structure", completed: false },
        { title: "Practice timing and oral delivery", completed: false }
      ];
    }

    setSubtasks([...subtasks, ...generated]);
  };

  // Filter tasks for List view
  const filteredTasks = tasks.filter((task) => {
    const matchesSearch =
      task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (task.description && task.description.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesFilter =
      filter === "all" ||
      (filter === "pending" && !task.completed) ||
      (filter === "completed" && task.completed);

    const matchesCategory =
      categoryFilter === "all" || (task.category || "General") === categoryFilter;

    return matchesSearch && matchesFilter && matchesCategory;
  });

  // Auth Guard
  if (!isAuthenticated) {
    if (showRegister) {
      return <Register onSwitchToLogin={() => setShowRegister(false)} onAuthenticated={acceptAuthentication} />;
    }
    return <Login onSwitchToRegister={() => setShowRegister(true)} onAuthenticated={acceptAuthentication} />;
  }

  const completedCount = tasks.filter((t) => t.completed).length;

  return (
    <div className="app-container">
      {/* APP NAVBAR */}
      <header className="navbar">
        <div className="nav-brand">
          <Sparkles className="logo-sparkle" size={24} />
          <span className="brand-name">TaskFlow <span>PRO</span></span>
        </div>

        {/* View Tabs */}
        <nav className="view-tabs">
          <button
            className={`tab-btn ${currentView === "kanban" ? "active" : ""}`}
            onClick={() => setCurrentView("kanban")}
          >
            <Kanban size={16} /> Kanban
          </button>
          <button
            className={`tab-btn ${currentView === "list" ? "active" : ""}`}
            onClick={() => setCurrentView("list")}
          >
            <List size={16} /> List
          </button>
          <button
            className={`tab-btn ${currentView === "eisenhower" ? "active" : ""}`}
            onClick={() => setCurrentView("eisenhower")}
          >
            <Grid size={16} /> Eisenhower
          </button>
          <button
            className={`tab-btn ${currentView === "focus" ? "active" : ""}`}
            onClick={() => setCurrentView("focus")}
          >
            <Clock size={16} /> Focus Room
          </button>
          <button
            className={`tab-btn ${currentView === "analytics" ? "active" : ""}`}
            onClick={() => setCurrentView("analytics")}
          >
            <BarChart3 size={16} /> Analytics
          </button>
        </nav>

        {/* User Stats & Controls */}
        <div className="nav-user-controls">
          <div className="streak-badge" title="Daily Streak">
            <Flame size={18} className="text-orange" />
            <span>{user?.streakCount || 1}d</span>
          </div>

          <div className="xp-badge" title="Level & Total XP">
            <Star size={16} fill="#eab308" color="#eab308" />
            <span>Lvl {user?.level || 1} ({user?.xp || 0} XP)</span>
          </div>

          <div className="theme-dropdown">
            <Palette size={18} />
            <select value={theme} onChange={(e) => setTheme(e.target.value)} className="theme-select">
              <option value="dark">Ocean Slate</option>
              <option value="zen">Zen Minimal</option>
              <option value="sunset">Sunset Glow</option>
              <option value="emerald">Emerald Forest</option>
            </select>
          </div>

          <button
            className="sound-toggle-btn"
            onClick={() => setSoundEnabled(!soundEnabled)}
            title={soundEnabled ? "Mute SFX" : "Enable SFX"}
          >
            {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>

          <button className="logout-icon-btn" onClick={logoutUser} title="Logout">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="main-content">
        {/* VIEW 1: KANBAN BOARD */}
        {currentView === "kanban" && (
          <section className="view-section">
            <div className="view-title-row">
              <div>
                <h2>Visual Kanban Board</h2>
                <p>Drag, move, and organize your task pipeline seamlessly.</p>
              </div>
              <button
                className="primary-action-btn"
                onClick={() => {
                  const el = document.getElementById("task-form-section");
                  if (el) el.scrollIntoView({ behavior: "smooth" });
                }}
              >
                <Plus size={18} /> New Task
              </button>
            </div>

            <KanbanBoard
              tasks={tasks}
              onUpdateTaskStatus={updateTaskStatus}
              onEditTask={startEditing}
              onDeleteTask={deleteTask}
              onStartFocus={(task) => {
                setActiveFocusTask(task);
                setCurrentView("focus");
              }}
            />
          </section>
        )}

        {/* VIEW 2: LIST VIEW */}
        {currentView === "list" && (
          <section className="view-section">
            <div className="view-title-row">
              <div>
                <h2>Interactive Task List</h2>
                <p>Filter, search, and manage your full task inventory.</p>
              </div>
            </div>

            <div className="list-controls-bar">
              <div className="search-box">
                <Search size={18} className="search-icon" />
                <input
                  type="text"
                  placeholder="Search tasks by title or description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="filter-group">
                <button className={`filter-chip ${filter === "all" ? "active" : ""}`} onClick={() => setFilter("all")}>
                  All ({tasks.length})
                </button>
                <button className={`filter-chip ${filter === "pending" ? "active" : ""}`} onClick={() => setFilter("pending")}>
                  Pending ({tasks.length - completedCount})
                </button>
                <button className={`filter-chip ${filter === "completed" ? "active" : ""}`} onClick={() => setFilter("completed")}>
                  Completed ({completedCount})
                </button>

                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="category-filter-select"
                >
                  <option value="all">All Categories</option>
                  <option value="Work">Work</option>
                  <option value="Personal">Personal</option>
                  <option value="Study">Study</option>
                  <option value="Fitness">Fitness</option>
                  <option value="Code">Code</option>
                  <option value="General">General</option>
                </select>
              </div>
            </div>

            <div className="task-list-cards">
              {filteredTasks.length === 0 ? (
                <div className="empty-state">No matching tasks found.</div>
              ) : (
                filteredTasks.map((t) => (
                  <div key={t._id} className={`task-list-row ${t.completed ? "completed-row" : ""}`}>
                    <button className="check-btn" onClick={() => toggleTask(t)}>
                      <CheckCircle2 size={22} className={t.completed ? "text-green" : "text-gray"} />
                    </button>

                    <div className="row-content">
                      <div className="row-header">
                        <h4 className={t.completed ? "line-through" : ""}>{t.title}</h4>
                        <span className={`category-tag cat-${(t.category || "General").toLowerCase()}`}>
                          {t.category || "General"}
                        </span>
                        <span className={`priority-badge ${t.priority || "medium"}`}>
                          {(t.priority || "medium").toUpperCase()}
                        </span>
                      </div>

                      {t.description && <p className="row-desc">{t.description}</p>}

                      <div className="row-footer">
                        {t.dueDate && (
                          <span className="due-pill">
                            <Calendar size={14} /> Due: {new Date(t.dueDate).toLocaleDateString()}
                          </span>
                        )}
                        <span className="xp-pill"><Star size={12} fill="#eab308" color="#eab308" /> +{t.xpValue || 20} XP</span>
                      </div>
                    </div>

                    <div className="row-actions">
                      <button className="icon-btn" onClick={() => startEditing(t)} title="Edit Task">
                        <Edit3 size={18} />
                      </button>
                      <button className="icon-btn danger" onClick={() => deleteTask(t._id)} title="Delete Task">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        )}

        {/* VIEW 3: EISENHOWER MATRIX */}
        {currentView === "eisenhower" && (
          <section className="view-section">
            <div className="view-title-row">
              <div>
                <h2>Eisenhower Matrix</h2>
                <p>Prioritize tasks based on urgency and importance.</p>
              </div>
            </div>
            <EisenhowerMatrix
              tasks={tasks}
              onUpdateTaskStatus={updateTaskStatus}
              onEditTask={startEditing}
              onDeleteTask={deleteTask}
            />
          </section>
        )}

        {/* VIEW 4: FOCUS ROOM */}
        {currentView === "focus" && (
          <section className="view-section center-view">
            <FocusTimer activeTask={activeFocusTask} />
          </section>
        )}

        {/* VIEW 5: ANALYTICS */}
        {currentView === "analytics" && (
          <section className="view-section">
            <div className="view-title-row">
              <div>
                <h2>Productivity Insights & XP</h2>
                <p>Track your completion habits, level progression, and badges.</p>
              </div>
            </div>
            <AnalyticsView tasks={tasks} user={user} />
          </section>
        )}

        {/* ADD / EDIT TASK FORM SECTION */}
        <section className="form-section-card" id="task-form-section">
          <div className="form-header">
            <h3>{editingTaskId ? "✏️ Edit Task" : "✨ Create New Task"}</h3>
            {editingTaskId && (
              <button className="cancel-edit-btn" onClick={resetForm}>
                Cancel Edit
              </button>
            )}
          </div>

          <div className="form-grid">
            <div className="form-field full">
              <label className="input-label">Task Title *</label>
              <input
                type="text"
                placeholder="What do you need to get done?"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="main-input"
              />
            </div>

            <div className="form-field full">
              <label className="input-label">Description (Optional)</label>
              <textarea
                placeholder="Add context, notes, or links..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="main-textarea"
              />
            </div>

            <div className="form-field">
              <label className="input-label">Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="main-select">
                <option value="General">General</option>
                <option value="Work">Work</option>
                <option value="Personal">Personal</option>
                <option value="Study">Study</option>
                <option value="Fitness">Fitness</option>
                <option value="Code">Code</option>
              </select>
            </div>

            <div className="form-field">
              <label className="input-label">Priority (XP Reward)</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value)} className="main-select">
                <option value="low">Low (+10 XP)</option>
                <option value="medium">Medium (+20 XP)</option>
                <option value="high">High (+30 XP)</option>
              </select>
            </div>

            <div className="form-field">
              <label className="input-label">Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="main-input"
              />
            </div>

            <div className="form-field full">
              <div className="magic-ai-bar">
                <span>Want subtasks? Try auto-suggest:</span>
                <button type="button" className="magic-ai-btn" onClick={applyMagicBreakdown}>
                  <Sparkles size={16} /> Magic AI Breakdown
                </button>
              </div>

              <SubtaskManager subtasks={subtasks} onChangeSubtasks={setSubtasks} />
            </div>

            <div className="form-field full">
              {editingTaskId ? (
                <button className="submit-btn highlight" onClick={updateTask}>
                  Update Task
                </button>
              ) : (
                <button className="submit-btn" onClick={addTask}>
                  <Plus size={20} /> Create Task & Earn XP
                </button>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;

