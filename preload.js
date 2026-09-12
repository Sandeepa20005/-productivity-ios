const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  isElectron: true,
  getInitialData: () => ipcRenderer.invoke('tracker:get-initial-data'),
  addTask: (title) => ipcRenderer.invoke('tracker:add-task', title),
  toggleTask: (taskId, isCompleted) => ipcRenderer.invoke('tracker:toggle-task', taskId, isCompleted),
  deleteTask: (taskId) => ipcRenderer.invoke('tracker:delete-task', taskId),
  addHabit: (habitName) => ipcRenderer.invoke('tracker:add-habit', habitName),
  deleteHabit: (habitId) => ipcRenderer.invoke('tracker:delete-habit', habitId),
  toggleHabitDay: (habitId, dateStr) => ipcRenderer.invoke('tracker:toggle-habit-day', habitId, dateStr),
  logFocusSession: (durationMins, label) => ipcRenderer.invoke('tracker:log-focus-session', durationMins, label),
  saveScratchpad: (content) => ipcRenderer.invoke('tracker:save-scratchpad', content)
});
