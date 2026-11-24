/**
 * TechBridge Task Management API (Task 7)
 *
 * Frontend -> fetch() -> REST API (Express) -> Task data (data/tasks.json)
 *
 * Endpoints
 *   GET  /api/health       Is the backend alive?
 *   GET  /api/tasks        All tasks (optional ?status=completed)
 *   GET  /api/tasks/:id    One task
 *   PUT  /api/tasks/:id    Update a task's status  { "status": "completed" }
 *
 * The server also serves the ../frontend folder, so you can open
 * http://localhost:3000/dashboard.html and everything is on one origin.
 */
const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

const VALID_STATUSES = ["completed", "in-progress", "not-started"];

// Task data is loaded into memory when the server starts.
// Status changes live in memory, so restarting the server resets them.
const DATA_FILE = path.join(__dirname, "data", "tasks.json");
const tasks = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));

app.use(express.json());

// Allow the frontend to call the API even if it is opened from another
// port (for example VS Code Live Server on :5500).
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, PUT, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

// Simple request log: METHOD /path -> status
app.use((req, res, next) => {
  res.on("finish", () => console.log(`${req.method} ${req.originalUrl} -> ${res.statusCode}`));
  next();
});

function findTask(idParam) {
  const id = Number(idParam);
  if (!Number.isInteger(id)) return null;
  return tasks.find((task) => task.id === id) || null;
}

// Health check, used by the dashboard's "Backend Status" indicator
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", tasks: tasks.length });
});

// GET /api/tasks  ->  every task
app.get("/api/tasks", (req, res) => {
  const { status } = req.query;
  if (status !== undefined) {
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        error: `Invalid status filter. Use one of: ${VALID_STATUSES.join(", ")}.`
      });
    }
    return res.json(tasks.filter((task) => task.status === status));
  }
  res.json(tasks);
});

// GET /api/tasks/:id  ->  one task
app.get("/api/tasks/:id", (req, res) => {
  const task = findTask(req.params.id);
  if (!task) {
    return res.status(404).json({ error: `Task ${req.params.id} was not found.` });
  }
  res.json(task);
});

// PUT /api/tasks/:id  ->  update a task's status
app.put("/api/tasks/:id", (req, res) => {
  const task = findTask(req.params.id);
  if (!task) {
    return res.status(404).json({ error: `Task ${req.params.id} was not found.` });
  }

  const status = req.body && req.body.status;
  if (!VALID_STATUSES.includes(status)) {
    return res.status(400).json({
      error: `A valid status is required. Use one of: ${VALID_STATUSES.join(", ")}.`
    });
  }

  task.status = status;
  res.json(task);
});

// Any other /api route is a JSON 404 (not an HTML page)
app.use("/api", (req, res) => {
  res.status(404).json({ error: "Endpoint not found." });
});

// Serve the website
app.use(express.static(path.join(__dirname, "..", "frontend")));

// Malformed JSON bodies and other unexpected errors
app.use((err, req, res, next) => {
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ error: "Request body must be valid JSON." });
  }
  console.error(err);
  res.status(500).json({ error: "Something went wrong on the server." });
});

app.listen(PORT, () => {
  console.log(`TechBridge API running at http://localhost:${PORT}`);
  console.log(`Dashboard:               http://localhost:${PORT}/dashboard.html`);
});
