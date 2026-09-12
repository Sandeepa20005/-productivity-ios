/**
 * Personal Productivity & Routine Tracker
 * Bento Grid Desktop Application Controller
 * Offline-First Reactive Architecture
 */

// Universal API Bridge (Electron IPC -> Local Server REST -> Offline Mobile LocalStorage Fallback)
const api = {
  getStoredMobileData() {
    const raw = localStorage.getItem('productivity_mobile_data');
    if (raw) return JSON.parse(raw);
    
    // Default initial seed data for iPhone
    const past7 = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      past7.push(d.toISOString().split('T')[0]);
    }
    const initial = {
      tasks: [
        { task_id: 1, title: 'Upload Moodle live-coding assignment', is_completed: 0, created_date: past7[6] },
        { task_id: 2, title: 'Draft cinematic vlog script in LaTeX', is_completed: 0, created_date: past7[6] },
        { task_id: 3, title: 'Review SQLite query optimization', is_completed: 1, created_date: past7[6] }
      ],
      habits: [
        {
          habit_id: 1,
          habit_name: 'Evening campus gym',
          current_streak: 4,
          history: past7.map((date, idx) => ({ date, completed: idx >= 3 }))
        },
        {
          habit_id: 2,
          habit_name: 'Recreational cricket',
          current_streak: 2,
          history: past7.map((date, idx) => ({ date, completed: idx === 1 || idx >= 4 }))
        },
        {
          habit_id: 3,
          habit_name: 'Deep focus reading & coding',
          current_streak: 5,
          history: past7.map((date, idx) => ({ date, completed: idx >= 2 }))
        }
      ],
      pastDates: past7,
      focusSessions: [
        { session_id: 1, duration_mins: 25, session_date: past7[6], label: 'Python environment troubleshooting' },
        { session_id: 2, duration_mins: 45, session_date: past7[6], label: 'Video rendering & LaTeX documentation' }
      ],
      scratchpad: '// Personal Scratchpad (iOS Ready)\n// Quick notes and deep work thoughts.'
    };
    localStorage.setItem('productivity_mobile_data', JSON.stringify(initial));
    return initial;
  },
  saveStoredMobileData(data) {
    localStorage.setItem('productivity_mobile_data', JSON.stringify(data));
  },

  async getInitialData() {
    if (window.api && window.api.getInitialData) return window.api.getInitialData();
    try {
      const res = await fetch('/api/data');
      if (!res.ok) throw new Error('API offline');
      return await res.json();
    } catch (e) {
      console.log('Using mobile offline storage:', e.message);
      return this.getStoredMobileData();
    }
  },
  async addTask(title) {
    if (window.api && window.api.addTask) return window.api.addTask(title);
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title })
      });
      if (!res.ok) throw new Error('API offline');
      return await res.json();
    } catch (e) {
      const data = this.getStoredMobileData();
      const newTask = {
        task_id: Date.now(),
        title,
        is_completed: 0,
        created_date: new Date().toISOString().split('T')[0]
      };
      data.tasks.unshift(newTask);
      this.saveStoredMobileData(data);
      return newTask;
    }
  },
  async toggleTask(taskId, isCompleted) {
    if (window.api && window.api.toggleTask) return window.api.toggleTask(taskId, isCompleted);
    try {
      const res = await fetch(`/api/tasks/${taskId}/toggle`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isCompleted })
      });
      if (!res.ok) throw new Error('API offline');
      return await res.json();
    } catch (e) {
      const data = this.getStoredMobileData();
      const task = data.tasks.find(t => t.task_id === taskId);
      if (task) {
        task.is_completed = isCompleted ? 1 : 0;
        this.saveStoredMobileData(data);
      }
      return task;
    }
  },
  async deleteTask(taskId) {
    if (window.api && window.api.deleteTask) return window.api.deleteTask(taskId);
    try {
      const res = await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('API offline');
      return await res.json();
    } catch (e) {
      const data = this.getStoredMobileData();
      data.tasks = data.tasks.filter(t => t.task_id !== taskId);
      this.saveStoredMobileData(data);
      return { success: true, taskId };
    }
  },
  async addHabit(name) {
    if (window.api && window.api.addHabit) return window.api.addHabit(name);
    try {
      const res = await fetch('/api/habits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });
      if (!res.ok) throw new Error('API offline');
      return await res.json();
    } catch (e) {
      const data = this.getStoredMobileData();
      const newHabit = {
        habit_id: Date.now(),
        habit_name: name,
        current_streak: 0,
        history: (data.pastDates || []).map(d => ({ date: d, completed: false }))
      };
      data.habits.push(newHabit);
      this.saveStoredMobileData(data);
      return newHabit;
    }
  },
  async deleteHabit(habitId) {
    if (window.api && window.api.deleteHabit) return window.api.deleteHabit(habitId);
    try {
      const res = await fetch(`/api/habits/${habitId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('API offline');
      return await res.json();
    } catch (e) {
      const data = this.getStoredMobileData();
      data.habits = data.habits.filter(h => h.habit_id !== habitId);
      this.saveStoredMobileData(data);
      return { success: true, habitId };
    }
  },
  async toggleHabitDay(habitId, dateStr) {
    if (window.api && window.api.toggleHabitDay) return window.api.toggleHabitDay(habitId, dateStr);
    try {
      const res = await fetch(`/api/habits/${habitId}/toggle-day`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dateStr })
      });
      if (!res.ok) throw new Error('API offline');
      return await res.json();
    } catch (e) {
      const data = this.getStoredMobileData();
      const habit = data.habits.find(h => h.habit_id === habitId);
      let streak = 0;
      if (habit) {
        if (!habit.history) habit.history = [];
        const entry = habit.history.find(h => h.date === dateStr);
        if (entry) {
          entry.completed = !entry.completed;
        } else {
          habit.history.push({ date: dateStr, completed: true });
        }
        streak = habit.history.filter(h => h.completed).length;
        habit.current_streak = streak;
        this.saveStoredMobileData(data);
      }
      return { success: true, habitId, dateStr, streak };
    }
  },
  async logFocusSession(durationMins, label) {
    if (window.api && window.api.logFocusSession) return window.api.logFocusSession(durationMins, label);
    try {
      const res = await fetch('/api/focus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ durationMins, label })
      });
      if (!res.ok) throw new Error('API offline');
      return await res.json();
    } catch (e) {
      const data = this.getStoredMobileData();
      const session = {
        session_id: Date.now(),
        duration_mins: durationMins,
        session_date: new Date().toISOString().split('T')[0],
        label: label || 'Focus Session'
      };
      data.focusSessions.unshift(session);
      this.saveStoredMobileData(data);
      return session;
    }
  },
  async saveScratchpad(content) {
    if (window.api && window.api.saveScratchpad) return window.api.saveScratchpad(content);
    try {
      const res = await fetch('/api/scratchpad', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      });
      if (!res.ok) throw new Error('API offline');
      return await res.json();
    } catch (e) {
      const data = this.getStoredMobileData();
      data.scratchpad = content;
      this.saveStoredMobileData(data);
      return { success: true };
    }
  }
};

// Global Reactive State
const state = {
  tasks: [],
  habits: [],
  pastDates: [],
  focusSessions: [],
  scratchpad: '',
  taskFilter: 'all',
  timer: {
    mode: 'pomodoro',
    totalSeconds: 25 * 60,
    remainingSeconds: 25 * 60,
    isRunning: false,
    intervalId: null
  }
};

// ============================================================================
// INITIALIZATION
// ============================================================================
document.addEventListener('DOMContentLoaded', async () => {
  initTheme();
  initClock();
  initTimerEventListeners();
  initScratchpadEventListeners();
  initTaskEventListeners();
  initHabitEventListeners();

  try {
    showToast('Connecting to local SQLite database...', 'info');
    const data = await api.getInitialData();
    state.tasks = data.tasks || [];
    state.habits = data.habits || [];
    state.pastDates = data.pastDates || [];
    state.focusSessions = data.focusSessions || [];
    state.scratchpad = data.scratchpad || '';

    // Render all modules
    renderTasks();
    renderHabits();
    renderAnalytics();
    renderScratchpad();
    showToast('Ready: SQLite loaded successfully', 'success');
  } catch (err) {
    console.error('Initialization error:', err);
    showToast('Failed to load local data: ' + err.message, 'error');
  }
});

// ============================================================================
// THEME CONTROLLER (WHITE & LIGHT BLUE / DARK BENTO)
// ============================================================================
function initTheme() {
  const toggleBtn = document.getElementById('btn-theme-toggle');
  const themeText = document.getElementById('theme-btn-text');
  const themeIcon = document.getElementById('theme-toggle-icon');

  // Default to light-blue as requested
  const savedTheme = localStorage.getItem('theme') || 'light-blue';
  applyTheme(savedTheme);

  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const currentTheme = document.documentElement.getAttribute('data-theme') || 'light-blue';
      const newTheme = currentTheme === 'light-blue' ? 'dark' : 'light-blue';
      applyTheme(newTheme);
      localStorage.setItem('theme', newTheme);
      showToast(newTheme === 'light-blue' ? 'Switched to White & Light Blue Theme' : 'Switched to Dark Bento Theme', 'info');
    });
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    if (theme === 'light-blue') {
      if (themeText) themeText.textContent = 'Dark Mode';
      if (themeIcon) {
        themeIcon.innerHTML = `
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
        `;
      }
    } else {
      if (themeText) themeText.textContent = 'Light Blue';
      if (themeIcon) {
        themeIcon.innerHTML = `
          <circle cx="12" cy="12" r="5"></circle>
          <line x1="12" y1="1" x2="12" y2="3"></line>
          <line x1="12" y1="21" x2="12" y2="23"></line>
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
          <line x1="1" y1="12" x2="3" y2="12"></line>
          <line x1="21" y1="12" x2="23" y2="12"></line>
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
        `;
      }
    }
  }
}

// ============================================================================
// HEADER: LIVE CLOCK & DATE
// ============================================================================
function initClock() {
  const clockTime = document.getElementById('clock-time');
  const clockDate = document.getElementById('clock-date');

  function update() {
    const now = new Date();
    clockTime.textContent = now.toLocaleTimeString('en-US', { hour12: false });
    clockDate.textContent = now.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  update();
  setInterval(update, 1000);
}

// ============================================================================
// ZONE 1: DAILY TASK MANAGER
// ============================================================================
function initTaskEventListeners() {
  const taskForm = document.getElementById('task-form');
  const taskInput = document.getElementById('task-input');
  const filterChips = document.querySelectorAll('.filter-chip');

  taskForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = taskInput.value.trim();
    if (!title) return;

    try {
      const newTask = await api.addTask(title);
      if (newTask) {
        state.tasks.unshift(newTask);
        taskInput.value = '';
        renderTasks();
        renderAnalytics();
        showToast('Mission added to checklist', 'success');
      }
    } catch (err) {
      showToast('Error adding task: ' + err.message, 'error');
    }
  });

  filterChips.forEach(chip => {
    chip.addEventListener('click', () => {
      filterChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      state.taskFilter = chip.dataset.filter;
      renderTasks();
    });
  });
}

function renderTasks() {
  const taskList = document.getElementById('task-list');
  const caption = document.getElementById('task-counter-caption');

  const total = state.tasks.length;
  const completed = state.tasks.filter(t => Boolean(t.is_completed)).length;
  caption.textContent = `${completed} of ${total} tasks completed`;

  const filtered = state.tasks.filter(task => {
    if (state.taskFilter === 'pending') return !task.is_completed;
    if (state.taskFilter === 'completed') return Boolean(task.is_completed);
    return true;
  });

  if (filtered.length === 0) {
    taskList.innerHTML = `
      <li style="text-align: center; padding: 30px; color: var(--text-muted); font-size: 0.88rem;">
        No tasks found in this view. Add one above!
      </li>
    `;
    return;
  }

  taskList.innerHTML = filtered.map(task => {
    const isDone = Boolean(task.is_completed);
    return `
      <li class="task-item ${isDone ? 'completed' : ''}" data-id="${task.task_id}">
        <div class="task-item-left">
          <button class="custom-checkbox" onclick="toggleTaskCompletion(${task.task_id}, ${!isDone})" title="${isDone ? 'Mark Pending' : 'Mark Complete'}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </button>
          <span class="task-title-text">${escapeHtml(task.title)}</span>
        </div>
        <div class="task-actions">
          <button class="btn-task-delete" onclick="deleteTaskItem(${task.task_id})" title="Delete Task">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </div>
      </li>
    `;
  }).join('');
}

window.toggleTaskCompletion = async function(taskId, newStatus) {
  try {
    const updated = await api.toggleTask(taskId, newStatus);
    const index = state.tasks.findIndex(t => t.task_id === taskId);
    if (index !== -1) {
      state.tasks[index].is_completed = newStatus ? 1 : 0;
      renderTasks();
      renderAnalytics();
      if (newStatus) {
        playSynthBeep(659.25, 0.1, 'sine');
      }
    }
  } catch (err) {
    showToast('Failed to toggle task: ' + err.message, 'error');
  }
};

window.deleteTaskItem = async function(taskId) {
  try {
    await api.deleteTask(taskId);
    state.tasks = state.tasks.filter(t => t.task_id !== taskId);
    renderTasks();
    renderAnalytics();
    showToast('Task removed', 'info');
  } catch (err) {
    showToast('Failed to delete task: ' + err.message, 'error');
  }
};

// ============================================================================
// ZONE 2: FOCUS & FLOW POMODORO TIMER
// ============================================================================
function initTimerEventListeners() {
  const modeButtons = document.querySelectorAll('.mode-btn');
  const toggleBtn = document.getElementById('btn-timer-toggle');
  const resetBtn = document.getElementById('btn-timer-reset');

  modeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      modeButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const mins = Number(btn.dataset.mins);
      state.timer.mode = btn.dataset.mode;
      state.timer.totalSeconds = mins * 60;
      state.timer.remainingSeconds = mins * 60;
      pauseTimer();
      updateTimerDisplay();
    });
  });

  toggleBtn.addEventListener('click', () => {
    if (state.timer.isRunning) {
      pauseTimer();
    } else {
      startTimer();
    }
  });

  resetBtn.addEventListener('click', () => {
    pauseTimer();
    state.timer.remainingSeconds = state.timer.totalSeconds;
    updateTimerDisplay();
  });

  updateTimerDisplay();
}

function startTimer() {
  state.timer.isRunning = true;
  document.getElementById('timer-toggle-text').textContent = 'Pause';
  document.getElementById('timer-state-label').textContent = 'In Deep Focus';
  document.getElementById('timer-state-label').style.color = 'var(--accent-amber)';

  const icon = document.getElementById('timer-toggle-icon');
  icon.innerHTML = `<rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect>`;

  state.timer.intervalId = setInterval(() => {
    if (state.timer.remainingSeconds > 0) {
      state.timer.remainingSeconds--;
      updateTimerDisplay();
    } else {
      onTimerComplete();
    }
  }, 1000);
}

function pauseTimer() {
  state.timer.isRunning = false;
  if (state.timer.intervalId) {
    clearInterval(state.timer.intervalId);
    state.timer.intervalId = null;
  }
  document.getElementById('timer-toggle-text').textContent = 'Start Focus';
  document.getElementById('timer-state-label').textContent = 'Paused';

  const icon = document.getElementById('timer-toggle-icon');
  icon.innerHTML = `<polygon points="5 3 19 12 5 21 5 3"></polygon>`;
}

function updateTimerDisplay() {
  const display = document.getElementById('timer-display');
  const progressRing = document.getElementById('timer-progress-ring');

  const m = Math.floor(state.timer.remainingSeconds / 60);
  const s = state.timer.remainingSeconds % 60;
  display.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

  // SVG Ring Progress Calculation (Circumference = 2 * PI * 94 ≈ 590.62)
  const circumference = 590.62;
  const progress = state.timer.remainingSeconds / state.timer.totalSeconds;
  const offset = circumference * (1 - progress);
  progressRing.style.strokeDashoffset = offset;
}

async function onTimerComplete() {
  pauseTimer();
  playPomodoroChime();

  const labelInput = document.getElementById('focus-label-input');
  const sessionLabel = labelInput.value.trim() || 'Focus Session';
  const durationMins = Math.round(state.timer.totalSeconds / 60);

  try {
    const session = await api.logFocusSession(durationMins, sessionLabel);
    if (session) {
      state.focusSessions.unshift(session);
      renderAnalytics();
    }
    showToast(`Focus session completed! (+${durationMins} mins logged)`, 'success');
  } catch (err) {
    console.error('Failed to log session:', err);
  }

  // Reset to default
  state.timer.remainingSeconds = state.timer.totalSeconds;
  updateTimerDisplay();
}

// Synthesized Audio Chime (Offline Web Audio API)
function playSynthBeep(freq, duration, type = 'sine') {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (e) {
    // Audio might be muted by browser policy before interaction
  }
}

function playPomodoroChime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5 - E5 - G5 - C6 chime
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        playSynthBeep(freq, 0.4, 'triangle');
      }, idx * 160);
    });
  } catch (e) {}
}

// ============================================================================
// ZONE 3: ROUTINE & HABIT TRACKER (7-DAY HISTORICAL MATRIX)
// ============================================================================
function initHabitEventListeners() {
  const btnOpenModal = document.getElementById('btn-open-habit-modal');
  const habitForm = document.getElementById('habit-form');
  const btnCancelHabit = document.getElementById('btn-cancel-habit');
  const habitInput = document.getElementById('habit-name-input');

  btnOpenModal.addEventListener('click', () => {
    habitForm.classList.remove('hidden');
    habitInput.focus();
  });

  btnCancelHabit.addEventListener('click', () => {
    habitForm.classList.add('hidden');
    habitInput.value = '';
  });

  habitForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = habitInput.value.trim();
    if (!name) return;

    try {
      const newHabit = await api.addHabit(name);
      if (newHabit) {
        newHabit.history = state.pastDates.map(d => ({ date: d, completed: false }));
        state.habits.push(newHabit);
        habitInput.value = '';
        habitForm.classList.add('hidden');
        renderHabits();
        showToast(`Habit "${name}" initiated!`, 'success');
      }
    } catch (err) {
      showToast('Failed to add habit: ' + err.message, 'error');
    }
  });
}

function renderHabits() {
  const matrixLabels = document.getElementById('matrix-day-labels');
  const habitsList = document.getElementById('habits-list');

  // Render 7-day header columns
  const todayStr = state.pastDates.length ? state.pastDates[state.pastDates.length - 1] : new Date().toISOString().split('T')[0];

  matrixLabels.innerHTML = state.pastDates.map(dateStr => {
    const d = new Date(dateStr + 'T00:00:00');
    const dayLetter = ['S', 'M', 'T', 'W', 'T', 'F', 'S'][d.getDay()];
    const isToday = dateStr === todayStr;
    return `
      <span class="matrix-header-day ${isToday ? 'today' : ''}" title="${dateStr}">
        ${dayLetter}
      </span>
    `;
  }).join('');

  if (state.habits.length === 0) {
    habitsList.innerHTML = `
      <div style="text-align:center; padding: 24px; color: var(--text-muted); font-size: 0.88rem;">
        No routines configured yet. Click "New Habit" to start building your streak!
      </div>
    `;
    return;
  }

  habitsList.innerHTML = state.habits.map(habit => {
    const streak = habit.current_streak || 0;
    const historyMap = {};
    (habit.history || []).forEach(h => {
      historyMap[h.date] = h.completed;
    });

    const dotsHtml = state.pastDates.map(dateStr => {
      const isDone = Boolean(historyMap[dateStr]);
      const isToday = dateStr === todayStr;
      return `
        <button 
          class="matrix-dot ${isDone ? 'completed' : ''} ${isToday ? 'today-dot' : ''}" 
          title="${dateStr} - ${isDone ? 'Completed' : 'Pending'}"
          onclick="toggleHabitDot(${habit.habit_id}, '${dateStr}')">
        </button>
      `;
    }).join('');

    return `
      <div class="habit-row" data-habit-id="${habit.habit_id}">
        <div class="habit-name-cell">
          <span>${escapeHtml(habit.habit_name)}</span>
        </div>
        <div>
          <span class="streak-badge ${streak === 0 ? 'streak-zero' : ''}">
            <span class="flame-icon">🔥</span>
            <span>${streak}d</span>
          </span>
        </div>
        <div class="habit-dots-matrix">
          ${dotsHtml}
        </div>
        <div class="habit-action-cell">
          <button class="btn-task-delete" onclick="deleteHabitRow(${habit.habit_id})" title="Delete Habit">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

window.toggleHabitDot = async function(habitId, dateStr) {
  try {
    const res = await api.toggleHabitDay(habitId, dateStr);
    const habit = state.habits.find(h => h.habit_id === habitId);
    if (habit) {
      habit.current_streak = res.streak;
      if (!habit.history) habit.history = [];
      const entry = habit.history.find(h => h.date === dateStr);
      if (entry) {
        entry.completed = !entry.completed;
      } else {
        habit.history.push({ date: dateStr, completed: true });
      }
      renderHabits();
      playSynthBeep(880, 0.08, 'sine');
    }
  } catch (err) {
    showToast('Failed to toggle habit day: ' + err.message, 'error');
  }
};

window.deleteHabitRow = async function(habitId) {
  try {
    await api.deleteHabit(habitId);
    state.habits = state.habits.filter(h => h.habit_id !== habitId);
    renderHabits();
    showToast('Habit removed', 'info');
  } catch (err) {
    showToast('Failed to delete habit: ' + err.message, 'error');
  }
};

// ============================================================================
// ZONE 4: ANALYTICS & PROGRESS (REAL-TIME SVG RADIAL GAUGE)
// ============================================================================
function renderAnalytics() {
  const percentEl = document.getElementById('analytics-percent');
  const fractionEl = document.getElementById('analytics-fraction');
  const bar = document.getElementById('analytics-radial-bar');
  const focusHoursEl = document.getElementById('stat-focus-hours');
  const velocityBadge = document.getElementById('stat-velocity-badge');

  const total = state.tasks.length;
  const completed = state.tasks.filter(t => Boolean(t.is_completed)).length;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  percentEl.textContent = `${percentage}%`;
  fractionEl.textContent = `${completed} / ${total} Done`;

  // SVG Circumference = 2 * PI * 66 ≈ 414.69
  const circumference = 414.69;
  const offset = circumference * (1 - percentage / 100);
  bar.style.strokeDashoffset = offset;

  // Total Focus Minutes
  const totalMins = state.focusSessions.reduce((acc, s) => acc + (s.duration_mins || 0), 0);
  const hours = (totalMins / 60).toFixed(1);
  focusHoursEl.textContent = hours;

  // Velocity indicator
  if (percentage >= 80) {
    velocityBadge.textContent = 'Peak Flow';
    velocityBadge.style.color = 'var(--accent-emerald)';
  } else if (percentage >= 40) {
    velocityBadge.textContent = 'Optimal';
    velocityBadge.style.color = 'var(--accent-sky)';
  } else {
    velocityBadge.textContent = 'In Motion';
    velocityBadge.style.color = 'var(--accent-amber)';
  }
}

// ============================================================================
// ZONE 5: SCRATCHPAD (DEBOUNCED AUTO-SAVING TO SQLITE)
// ============================================================================
let scratchpadTimeout = null;

function initScratchpadEventListeners() {
  const textarea = document.getElementById('scratchpad-textarea');
  const btnCopy = document.getElementById('btn-copy-scratchpad');
  const btnClear = document.getElementById('btn-clear-scratchpad');
  const counter = document.getElementById('scratchpad-counter');
  const statusIndicator = document.querySelector('.status-indicator');
  const statusText = document.getElementById('scratchpad-status-text');

  textarea.addEventListener('input', () => {
    updateScratchpadCounters();

    statusIndicator.classList.add('saving');
    statusText.textContent = 'Saving to SQLite...';

    if (scratchpadTimeout) clearTimeout(scratchpadTimeout);
    scratchpadTimeout = setTimeout(async () => {
      try {
        await api.saveScratchpad(textarea.value);
        statusIndicator.classList.remove('saving');
        statusText.textContent = 'Synced with SQLite';
      } catch (err) {
        statusText.textContent = 'Sync error';
        console.error('Scratchpad save error:', err);
      }
    }, 400);
  });

  btnCopy.addEventListener('click', async () => {
    if (!textarea.value) {
      showToast('Scratchpad is empty', 'info');
      return;
    }
    try {
      await navigator.clipboard.writeText(textarea.value);
      showToast('Copied notes to clipboard!', 'success');
    } catch (e) {
      textarea.select();
      document.execCommand('copy');
      showToast('Copied notes to clipboard!', 'success');
    }
  });

  btnClear.addEventListener('click', async () => {
    if (!textarea.value) return;
    if (confirm('Clear scratchpad content?')) {
      textarea.value = '';
      updateScratchpadCounters();
      await api.saveScratchpad('');
      showToast('Scratchpad cleared', 'info');
    }
  });
}

function renderScratchpad() {
  const textarea = document.getElementById('scratchpad-textarea');
  textarea.value = state.scratchpad || '';
  updateScratchpadCounters();
}

function updateScratchpadCounters() {
  const textarea = document.getElementById('scratchpad-textarea');
  const counter = document.getElementById('scratchpad-counter');
  const text = textarea.value;
  const chars = text.length;
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  counter.textContent = `${chars} chars • ${words} words`;
}

// ============================================================================
// TOAST NOTIFICATION UTILITY
// ============================================================================
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  let icon = 'ℹ️';
  if (type === 'success') icon = '✓';
  if (type === 'error') icon = '✕';

  toast.innerHTML = `<span style="font-weight:700; color:var(--accent-purple);">${icon}</span> <span>${escapeHtml(message)}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}
