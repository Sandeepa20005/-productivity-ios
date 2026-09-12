const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const db = require('./database.js');

const PORT = process.env.PORT || 3000;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        resolve({});
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(data));
}

const server = http.createServer(async (req, res) => {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    return res.end();
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  const pathname = parsedUrl.pathname;

  // API Routes
  if (pathname.startsWith('/api/')) {
    try {
      if (req.method === 'GET' && pathname === '/api/data') {
        const data = db.getInitialData();
        return sendJson(res, 200, data);
      }

      if (req.method === 'POST' && pathname === '/api/tasks') {
        const body = await readBody(req);
        const task = db.addTask(body.title);
        return sendJson(res, 201, task);
      }

      if (req.method === 'PUT' && pathname.match(/^\/api\/tasks\/(\d+)\/toggle$/)) {
        const taskId = Number(pathname.match(/^\/api\/tasks\/(\d+)\/toggle$/)[1]);
        const body = await readBody(req);
        const updated = db.toggleTask(taskId, body.isCompleted);
        return sendJson(res, 200, updated);
      }

      if (req.method === 'DELETE' && pathname.match(/^\/api\/tasks\/(\d+)$/)) {
        const taskId = Number(pathname.match(/^\/api\/tasks\/(\d+)$/)[1]);
        const result = db.deleteTask(taskId);
        return sendJson(res, 200, result);
      }

      if (req.method === 'POST' && pathname === '/api/habits') {
        const body = await readBody(req);
        const habit = db.addHabit(body.name);
        return sendJson(res, 201, habit);
      }

      if (req.method === 'DELETE' && pathname.match(/^\/api\/habits\/(\d+)$/)) {
        const habitId = Number(pathname.match(/^\/api\/habits\/(\d+)$/)[1]);
        const result = db.deleteHabit(habitId);
        return sendJson(res, 200, result);
      }

      if (req.method === 'POST' && pathname.match(/^\/api\/habits\/(\d+)\/toggle-day$/)) {
        const habitId = Number(pathname.match(/^\/api\/habits\/(\d+)\/toggle-day$/)[1]);
        const body = await readBody(req);
        const result = db.toggleHabitDay(habitId, body.dateStr);
        return sendJson(res, 200, result);
      }

      if (req.method === 'POST' && pathname === '/api/focus') {
        const body = await readBody(req);
        const session = db.logFocusSession(body.durationMins, body.label);
        return sendJson(res, 201, session);
      }

      if (req.method === 'POST' && pathname === '/api/scratchpad') {
        const body = await readBody(req);
        const result = db.saveScratchpad(body.content);
        return sendJson(res, 200, result);
      }

      return sendJson(res, 404, { error: 'Route not found' });
    } catch (err) {
      console.error('API Error:', err);
      return sendJson(res, 500, { error: err.message });
    }
  }

  // Static File Serving
  let filePath = path.join(__dirname, pathname === '/' ? 'index.html' : pathname);
  const ext = path.extname(filePath).toLowerCase();

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end(`500 Server Error: ${err.code}`);
      }
    } else {
      res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
      res.end(content);
    }
  });
});

server.listen(PORT, () => {
  console.log(`[Productivity Tracker] Running at http://localhost:${PORT}`);
});

module.exports = server;
