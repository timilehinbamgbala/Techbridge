# TechBridge Task Management (Task 7)

A Node.js + Express REST API for the TechBridge internship tasks, connected to the Task 6 Intern Dashboard.

```
Dashboard (HTML/CSS) -> dashboard.js (fetch) -> REST API (Express) -> data/tasks.json
```

## Run it

```bash
cd backend
npm install
npm start
```

Then open **http://localhost:3000/dashboard.html**.

The Express server also serves the `frontend/` folder, so the page and the API share one address.
If you prefer VS Code Live Server for the frontend, that works too: `dashboard.js` automatically calls `http://localhost:3000` when the page is not served from port 3000 (the API allows this with CORS headers).

## Project structure

```
techbridge-task-management/
├── frontend/
│   ├── index.html, programs.html, internship-tasks.html, challenges.html
│   ├── dashboard.html
│   ├── css/style.css
│   ├── js/script.js        (site-wide scripts from earlier tasks)
│   ├── js/dashboard.js     (Task 7: talks to the API)
│   └── images/
└── backend/
    ├── server.js
    ├── package.json / package-lock.json
    └── data/tasks.json
```

## API documentation

| Method | Endpoint         | Purpose                                              |
| ------ | ---------------- | ---------------------------------------------------- |
| GET    | `/api/health`    | Check the backend is running (powers Backend Status) |
| GET    | `/api/tasks`     | Get all tasks (optional `?status=completed`)         |
| GET    | `/api/tasks/:id` | Get one task                                         |
| PUT    | `/api/tasks/:id` | Update a task's status                               |

**Task object**

```json
{
  "id": 3,
  "title": "Build the Internship Tasks Experience",
  "description": "Create an interface that presents the TechBridge internship tasks...",
  "difficulty": "Beginner to Intermediate",
  "status": "completed"
}
```

`status` is one of `completed`, `in-progress`, `not-started`.

**PUT /api/tasks/:id** expects a JSON body:

```json
{ "status": "completed" }
```

It returns the updated task. Errors are always JSON, e.g. `404 { "error": "Task 99 was not found." }` or `400 { "error": "A valid status is required..." }`.

Task changes are kept in memory, so restarting the server resets them to `data/tasks.json`.

## Dashboard features

- Tasks, progress, current task and internship status are all built from API data
- Loading state ("Loading tasks...") and error state ("Unable to load tasks.") with a Try again button
- Filters: All, Completed, In Progress, Not Started
- View Task opens a modal using `GET /api/tasks/:id` (no page refresh)
- Mark as Completed uses `PUT /api/tasks/:id` and updates the progress count and percentage
- Backend Status indicator (Connected / Offline), checked every few seconds, so the dashboard recovers by itself when the backend comes back

## Test checklist

1. Open the dashboard: tasks load
2. Stop the backend: an error message appears and Backend Status shows Offline
3. Restart the backend: click Try again and the dashboard works again
4. Click View Task: the correct task appears
5. Click Mark as Completed: the status changes
6. The progress percentage updates
7. Filters still work

## Run on CodeSandbox (easiest)

1. Create a **Devbox** from the **Node.js** template.
2. Drag the contents of this folder into the file explorer.
3. In the terminal run `npm install` then `npm start` (from the project root).
4. In the Ports panel open port **3000** and add `/dashboard.html` to the URL.
