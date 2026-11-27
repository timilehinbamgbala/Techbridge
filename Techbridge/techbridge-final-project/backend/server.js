const express = require("express");
const path = require("path");
const { tasks } = require("./data/store");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, PUT, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

app.use((req, res, next) => {
  res.on("finish", () => console.log(`${req.method} ${req.originalUrl} -> ${res.statusCode}`));
  next();
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", tasks: tasks.length });
});

app.use("/api/tasks", require("./routes/tasks"));
app.use("/api/challenges", require("./routes/challenges"));
app.use("/api/search", require("./routes/search"));

app.use("/api", (req, res) => {
  res.status(404).json({ error: "Endpoint not found." });
});

app.use(express.static(path.join(__dirname, "..", "frontend")));

app.use((err, req, res, next) => {
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ error: "Request body must be valid JSON." });
  }
  console.error(err);
  res.status(500).json({ error: "Something went wrong on the server." });
});

app.listen(PORT, () => {
  console.log(`TechBridge platform running at http://localhost:${PORT}`);
  console.log(`Dashboard: http://localhost:${PORT}/dashboard.html`);
});
