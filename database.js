const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');

const DB_PATH = path.join(__dirname, 'tracker.db');
const db = new DatabaseSync(DB_PATH);

// Initialize schema
function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      task_id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      is_completed BOOLEAN DEFAULT 0,
      created_date DATE DEFAULT (DATE('now'))
    );

    CREATE TABLE IF NOT EXISTS habits (
      habit_id INTEGER PRIMARY KEY AUTOINCREMENT,
      habit_name TEXT NOT NULL,
      current_streak INTEGER DEFAULT 0,
      last_logged DATE NULL
    );

    CREATE TABLE IF NOT EXISTS habit_logs (
      log_id INTEGER PRIMARY KEY AUTOINCREMENT,
      habit_id INTEGER NOT NULL,
      log_date DATE NOT NULL,
      completed BOOLEAN DEFAULT 1,
      UNIQUE(habit_id, log_date),
      FOREIGN KEY(habit_id) REFERENCES habits(habit_id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS focus_sessions (
      session_id INTEGER PRIMARY KEY AUTOINCREMENT,
      duration_mins INTEGER NOT NULL,
      session_date DATE DEFAULT (DATE('now')),
      label TEXT
    );

    CREATE TABLE IF NOT EXISTS scratchpad (
      id INTEGER PRIMARY KEY,
      content TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  seedInitialData();
}

function getTodayStr() {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

function getPastDates(days = 7) {
  const dates = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().split('T')[0]);
  }
  return dates;
}

function seedInitialData() {
  const taskCount = db.prepare('SELECT COUNT(*) as count FROM tasks').get().count;
  if (taskCount === 0) {
    const insertTask = db.prepare('INSERT INTO tasks (title, is_completed, created_date) VALUES (?, ?, ?)');
    const today = getTodayStr();
    insertTask.run('Upload Moodle live-coding assignment', 0, today);
    insertTask.run('Draft cinematic vlog script in LaTeX', 0, today);
    insertTask.run('Review SQLite query optimization', 1, today);
  }

  const habitCount = db.prepare('SELECT COUNT(*) as count FROM habits').get().count;
  if (habitCount === 0) {
    const insertHabit = db.prepare('INSERT INTO habits (habit_name, current_streak, last_logged) VALUES (?, ?, ?)');
    const insertLog = db.prepare('INSERT OR REPLACE INTO habit_logs (habit_id, log_date, completed) VALUES (?, ?, 1)');
    const past7 = getPastDates(7);
    const today = past7[6];

    // Habit 1: Evening campus gym
    const h1 = insertHabit.run('Evening campus gym', 4, today);
    const h1Id = Number(h1.lastInsertRowid);
    [past7[3], past7[4], past7[5], past7[6]].forEach(d => insertLog.run(h1Id, d));

    // Habit 2: Recreational cricket
    const h2 = insertHabit.run('Recreational cricket', 2, today);
    const h2Id = Number(h2.lastInsertRowid);
    [past7[1], past7[4], past7[5]].forEach(d => insertLog.run(h2Id, d));

    // Habit 3: Deep focus reading
    const h3 = insertHabit.run('Deep focus reading & coding', 5, today);
    const h3Id = Number(h3.lastInsertRowid);
    [past7[2], past7[3], past7[4], past7[5], past7[6]].forEach(d => insertLog.run(h3Id, d));
  }

  const sessionCount = db.prepare('SELECT COUNT(*) as count FROM focus_sessions').get().count;
  if (sessionCount === 0) {
    const insertSession = db.prepare('INSERT INTO focus_sessions (duration_mins, session_date, label) VALUES (?, ?, ?)');
    const today = getTodayStr();
    insertSession.run(25, today, 'Python environment troubleshooting');
    insertSession.run(45, today, 'Video rendering & LaTeX documentation');
  }

  const scratchpadCount = db.prepare('SELECT COUNT(*) as count FROM scratchpad').get().count;
  if (scratchpadCount === 0) {
    const insertNote = db.prepare('INSERT INTO scratchpad (id, content) VALUES (1, ?)');
    insertNote.run(`// Quick Scratchpad & Code Buffer
// Fast notes, LaTeX snippets, shell commands or terminal flags:
const config = {
  theme: 'bento-dark',
  offlineFirst: true,
  engine: 'sqlite'
};
console.log('System ready for deep work!');`);
  }
}

// Data retrieval methods
function getInitialData() {
  const tasks = db.prepare('SELECT * FROM tasks ORDER BY task_id DESC').all();
  const habits = db.prepare('SELECT * FROM habits ORDER BY habit_id ASC').all();
  const past7Dates = getPastDates(7);

  // Fetch logs for the past 7 days
  const logs = db.prepare(`
    SELECT habit_id, log_date, completed 
    FROM habit_logs 
    WHERE log_date >= ?
  `).all(past7Dates[0]);

  const habitLogsMap = {};
  for (const row of logs) {
    if (!habitLogsMap[row.habit_id]) {
      habitLogsMap[row.habit_id] = {};
    }
    habitLogsMap[row.habit_id][row.log_date] = Boolean(row.completed);
  }

  const enrichedHabits = habits.map(h => ({
    ...h,
    history: past7Dates.map(date => ({
      date,
      completed: Boolean(habitLogsMap[h.habit_id] && habitLogsMap[h.habit_id][date])
    }))
  }));

  const focusSessions = db.prepare('SELECT * FROM focus_sessions WHERE session_date = ? ORDER BY session_id DESC').all(getTodayStr());
  const scratchpad = db.prepare('SELECT content FROM scratchpad WHERE id = 1').get() || { content: '' };

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.is_completed).length;
  const totalFocusMinutes = focusSessions.reduce((acc, s) => acc + (s.duration_mins || 0), 0);

  return {
    tasks,
    habits: enrichedHabits,
    pastDates: past7Dates,
    focusSessions,
    scratchpad: scratchpad.content,
    stats: {
      totalTasks,
      completedTasks,
      completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
      totalFocusMinutes
    }
  };
}

// Tasks Operations
function addTask(title) {
  if (!title || !title.trim()) return null;
  const stmt = db.prepare('INSERT INTO tasks (title, is_completed, created_date) VALUES (?, 0, ?)');
  const info = stmt.run(title.trim(), getTodayStr());
  return db.prepare('SELECT * FROM tasks WHERE task_id = ?').get(info.lastInsertRowid);
}

function toggleTask(taskId, isCompleted) {
  const stmt = db.prepare('UPDATE tasks SET is_completed = ? WHERE task_id = ?');
  stmt.run(isCompleted ? 1 : 0, taskId);
  return db.prepare('SELECT * FROM tasks WHERE task_id = ?').get(taskId);
}

function deleteTask(taskId) {
  const stmt = db.prepare('DELETE FROM tasks WHERE task_id = ?');
  stmt.run(taskId);
  return { success: true, taskId };
}

// Habits Operations
function calculateStreak(habitId) {
  const logs = db.prepare(`
    SELECT log_date, completed 
    FROM habit_logs 
    WHERE habit_id = ? AND completed = 1 
    ORDER BY log_date DESC
  `).all(habitId);

  if (!logs || logs.length === 0) return 0;

  const logDates = new Set(logs.map(l => l.log_date));
  let streak = 0;
  const checkDate = new Date();

  // If today isn't logged, start check from yesterday
  const todayStr = checkDate.toISOString().split('T')[0];
  if (!logDates.has(todayStr)) {
    checkDate.setDate(checkDate.getDate() - 1);
  }

  while (true) {
    const dStr = checkDate.toISOString().split('T')[0];
    if (logDates.has(dStr)) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

function toggleHabitDay(habitId, logDate) {
  const existing = db.prepare('SELECT * FROM habit_logs WHERE habit_id = ? AND log_date = ?').get(habitId, logDate);
  if (existing && existing.completed) {
    db.prepare('DELETE FROM habit_logs WHERE habit_id = ? AND log_date = ?').run(habitId, logDate);
  } else {
    db.prepare('INSERT OR REPLACE INTO habit_logs (habit_id, log_date, completed) VALUES (?, ?, 1)').run(habitId, logDate);
  }

  const streak = calculateStreak(habitId);
  db.prepare('UPDATE habits SET current_streak = ?, last_logged = ? WHERE habit_id = ?').run(streak, logDate, habitId);

  return { success: true, habitId, logDate, streak };
}

function addHabit(habitName) {
  if (!habitName || !habitName.trim()) return null;
  const stmt = db.prepare('INSERT INTO habits (habit_name, current_streak) VALUES (?, 0)');
  const info = stmt.run(habitName.trim());
  return db.prepare('SELECT * FROM habits WHERE habit_id = ?').get(info.lastInsertRowid);
}

function deleteHabit(habitId) {
  db.prepare('DELETE FROM habit_logs WHERE habit_id = ?').run(habitId);
  db.prepare('DELETE FROM habits WHERE habit_id = ?').run(habitId);
  return { success: true, habitId };
}

// Focus Sessions Operations
function logFocusSession(durationMins, label) {
  const stmt = db.prepare('INSERT INTO focus_sessions (duration_mins, session_date, label) VALUES (?, ?, ?)');
  const today = getTodayStr();
  const info = stmt.run(durationMins, today, label || 'Focus Session');
  return db.prepare('SELECT * FROM focus_sessions WHERE session_id = ?').get(info.lastInsertRowid);
}

// Scratchpad Operations
function saveScratchpad(content) {
  db.prepare('INSERT OR REPLACE INTO scratchpad (id, content, updated_at) VALUES (1, ?, CURRENT_TIMESTAMP)').run(content);
  return { success: true };
}

// Run initialization
initSchema();

module.exports = {
  db,
  getInitialData,
  addTask,
  toggleTask,
  deleteTask,
  addHabit,
  deleteHabit,
  toggleHabitDay,
  logFocusSession,
  saveScratchpad,
  getTodayStr,
  getPastDates
};
