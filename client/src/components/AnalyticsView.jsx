import { Trophy, Award, Target, Zap, CheckCircle2, ListTodo, Shield } from "lucide-react";

export default function AnalyticsView({ tasks, user }) {
  const total = tasks.length;
  const completed = tasks.filter((t) => t.completed).length;
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  const highPriority = tasks.filter((t) => t.priority === "high").length;
  const medPriority = tasks.filter((t) => t.priority === "medium").length;
  const lowPriority = tasks.filter((t) => t.priority === "low").length;

  const categories = ["Work", "Personal", "Study", "Fitness", "Code", "General"];
  const categoryStats = categories.map((cat) => ({
    name: cat,
    count: tasks.filter((t) => (t.category || "General") === cat).length,
  }));

  const userXp = user?.xp || 0;
  const userLevel = user?.level || 1;
  const xpInCurrentLevel = userXp % 100;
  const streakCount = user?.streakCount || 0;
  const badges = user?.badges || ["Starter"];

  return (
    <div className="analytics-view-container">
      {/* Top Banner Stats */}
      <div className="analytics-banner">
        <div className="analytics-card highlight-card">
          <Trophy size={32} className="text-yellow" />
          <div className="analytics-card-info">
            <span className="card-label">Level & XP</span>
            <h2 className="card-value">Level {userLevel}</h2>
            <div className="xp-bar-container">
              <div className="xp-bar-fill" style={{ width: `${xpInCurrentLevel}%` }}></div>
            </div>
            <span className="sub-text">{xpInCurrentLevel}/100 XP to next level</span>
          </div>
        </div>

        <div className="analytics-card">
          <Zap size={32} className="text-orange" />
          <div className="analytics-card-info">
            <span className="card-label">Daily Streak</span>
            <h2 className="card-value">{streakCount} Days 🔥</h2>
            <span className="sub-text">Keep logging daily to retain streak!</span>
          </div>
        </div>

        <div className="analytics-card">
          <Target size={32} className="text-blue" />
          <div className="analytics-card-info">
            <span className="card-label">Completion Rate</span>
            <h2 className="card-value">{completionRate}%</h2>
            <span className="sub-text">{completed} of {total} tasks finished</span>
          </div>
        </div>
      </div>

      <div className="analytics-grid">
        {/* Priority Breakdown */}
        <div className="analytics-box">
          <h3><ListTodo size={20} /> Tasks by Priority</h3>
          <div className="stat-bars-group">
            <div className="stat-bar-row">
              <span className="row-label">High Priority ({highPriority})</span>
              <div className="bar-track">
                <div className="bar-fill high-fill" style={{ width: `${total > 0 ? (highPriority / total) * 100 : 0}%` }}></div>
              </div>
            </div>

            <div className="stat-bar-row">
              <span className="row-label">Medium Priority ({medPriority})</span>
              <div className="bar-track">
                <div className="bar-fill med-fill" style={{ width: `${total > 0 ? (medPriority / total) * 100 : 0}%` }}></div>
              </div>
            </div>

            <div className="stat-bar-row">
              <span className="row-label">Low Priority ({lowPriority})</span>
              <div className="bar-track">
                <div className="bar-fill low-fill" style={{ width: `${total > 0 ? (lowPriority / total) * 100 : 0}%` }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="analytics-box">
          <h3><CheckCircle2 size={20} /> Category Distribution</h3>
          <div className="category-tags-grid">
            {categoryStats.map((cat) => (
              <div key={cat.name} className="cat-stat-tile">
                <span className="cat-tile-name">{cat.name}</span>
                <span className="cat-tile-count">{cat.count} Tasks</span>
              </div>
            ))}
          </div>
        </div>

        {/* Badges Showcase */}
        <div className="analytics-box full-width">
          <h3><Award size={20} /> Achievement Badges</h3>
          <div className="badges-flex">
            {badges.map((badge, idx) => (
              <div key={idx} className="badge-chip">
                <Shield size={18} className="text-yellow" />
                <span>{badge}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
