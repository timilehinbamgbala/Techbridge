const express = require("express");
const { tasks, challenges } = require("../data/store");

const router = express.Router();

function matches(query, fields) {
  const haystack = fields.join(" ").toLowerCase();
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((term) => haystack.includes(term));
}

router.get("/", (req, res) => {
  const query = String(req.query.q || "").trim();
  if (!query) return res.json({ query, tasks: [], challenges: [] });

  const taskHits = tasks.filter((t) =>
    matches(query, [t.title, t.description, t.difficulty || "", t.status.replace("-", " ")])
  );

  const challengeHits = challenges.filter((c) =>
    matches(query, [
      c.title,
      c.track,
      c.level,
      c.summary,
      c.objective,
      c.outcome,
      (c.skills || []).join(" "),
      (c.tools || []).join(" ")
    ])
  );

  res.json({ query, tasks: taskHits, challenges: challengeHits });
});

module.exports = router;
