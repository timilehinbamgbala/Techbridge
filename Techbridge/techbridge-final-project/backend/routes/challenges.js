const express = require("express");
const { challenges } = require("../data/store");

const router = express.Router();

router.get("/", (req, res) => {
  const { track, level } = req.query;
  let list = challenges;
  if (track) list = list.filter((c) => c.track === track);
  if (level) list = list.filter((c) => c.level === level);
  res.json(list);
});

router.get("/:id", (req, res) => {
  const challenge = challenges.find((c) => c.id === req.params.id);
  if (!challenge) return res.status(404).json({ error: `Challenge ${req.params.id} was not found.` });
  res.json(challenge);
});

module.exports = router;
