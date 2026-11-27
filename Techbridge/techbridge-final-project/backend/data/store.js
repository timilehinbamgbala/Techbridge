const fs = require("fs");
const path = require("path");

const load = (name) => JSON.parse(fs.readFileSync(path.join(__dirname, name), "utf8"));

module.exports = {
  tasks: load("tasks.json"),
  challenges: load("challenges.json"),
  VALID_STATUSES: ["completed", "in-progress", "not-started"]
};
