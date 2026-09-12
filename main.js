const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('node:path');
const db = require('./database.js');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1320,
    height: 900,
    minWidth: 1040,
    minHeight: 740,
    title: 'Personal Productivity & Routine Tracker',
    backgroundColor: '#F0F6FE',
    titleBarStyle: 'default',
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  mainWindow.loadFile('index.html');

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// IPC Handlers
ipcMain.handle('tracker:get-initial-data', async () => {
  return db.getInitialData();
});

ipcMain.handle('tracker:add-task', async (_event, title) => {
  return db.addTask(title);
});

ipcMain.handle('tracker:toggle-task', async (_event, taskId, isCompleted) => {
  return db.toggleTask(taskId, isCompleted);
});

ipcMain.handle('tracker:delete-task', async (_event, taskId) => {
  return db.deleteTask(taskId);
});

ipcMain.handle('tracker:add-habit', async (_event, habitName) => {
  return db.addHabit(habitName);
});

ipcMain.handle('tracker:delete-habit', async (_event, habitId) => {
  return db.deleteHabit(habitId);
});

ipcMain.handle('tracker:toggle-habit-day', async (_event, habitId, dateStr) => {
  return db.toggleHabitDay(habitId, dateStr);
});

ipcMain.handle('tracker:log-focus-session', async (_event, durationMins, label) => {
  return db.logFocusSession(durationMins, label);
});

ipcMain.handle('tracker:save-scratchpad', async (_event, content) => {
  return db.saveScratchpad(content);
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
