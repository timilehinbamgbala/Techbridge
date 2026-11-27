const express = require("express");
const { tasks, VALID_STATUSES } = require("../data/store");

const router = express.Router();

function findTask(idParam) {
  const id = Number(idParam);
  if (!Number.isInteger(id)) return null;
  return tasks.find((task) => task.id === id) || null;
}

router.get("/", (req, res) => {
  const { status } = req.query;
  if (status === undefined) return res.json(tasks);
  if (!VALID_STATUSES.includes(status)) {
    return res.status(400).json({
      error: `Invalid status filter. Use one of: ${VALID_STATUSES.join(", ")}.`
    });
  }
  res.json(tasks.filter((task) => task.status === status));
});

router.get("/:id", (req, res) => {
  const task = findTask(req.params.id);
  if (!task) return res.status(404).json({ error: `Task ${req.params.id} was not found.` });
  res.json(task);
});

router.put("/:id", (req, res) => {
  const task = findTask(req.params.id);
  if (!task) return res.status(404).json({ error: `Task ${req.params.id} was not found.` });

  const status = req.body && req.body.status;
  if (!VALID_STATUSES.includes(status)) {
    return res.status(400).json({
      error: `A valid status is required. Use one of: ${VALID_STATUSES.join(", ")}.`
    });
  }

  task.status = status;
  res.json(task);
});

module.exports = router;
