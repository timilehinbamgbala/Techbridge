# TechBridge Intern Management Platform

A web platform where TechBridge interns track their internship progress, work through their tasks, explore practical challenges and search across both. A Node.js and Express API serves the data and the frontend talks to it with `fetch()`.

## Technologies Used

HTML, CSS, JavaScript, Node.js, Express.js, REST API, JSON

## Main Features

- Landing page with navigation to the dashboard, challenges, programs and internship tasks
- Intern Dashboard showing track, internship status, current task, total, completed and remaining tasks, progress percentage and a progress bar
- Tasks 1 to 8 loaded from the API, with a View Task modal and no page refresh
- Task status flow: Not Started, then In Progress, then Completed, saved through the API. Counts, percentage and progress bar update instantly
- Task filters: All, Completed, In Progress, Not Started
- Challenge Hub loaded from the API: 4 Data Analytics and 4 Web Development challenges, filtering by track and difficulty, sorting, and a View Challenge modal
- Search across tasks and challenges from the dashboard, with a "No matching results found." message when nothing matches
- Loading and error states for tasks and challenges, with Try again buttons
- Backend Status indicator (Connected or Offline) that recovers when the backend returns
- Responsive layout for desktop, tablet and mobile

## How to Run the Project

```bash
npm install
npm start
```

Then open http://localhost:3000. The Express server serves both the API and the website.

The same commands also work from the `backend` folder (`cd backend`, `npm install`, `npm start`).

## API Endpoints

| Method | Endpoint              | Purpose                                              |
| ------ | --------------------- | ---------------------------------------------------- |
| GET    | `/api/health`         | Check that the backend is running                    |
| GET    | `/api/tasks`          | Get all tasks (optional `?status=completed`)         |
| GET    | `/api/tasks/:id`      | Get one task                                         |
| PUT    | `/api/tasks/:id`      | Update a task's status, body `{ "status": "completed" }` |
| GET    | `/api/challenges`     | Get all challenges (optional `?track=` and `?level=`) |
| GET    | `/api/challenges/:id` | Get one challenge                                    |
| GET    | `/api/search?q=term`  | Search tasks and challenges                          |

Valid statuses: `completed`, `in-progress`, `not-started`. Task changes are kept in memory, so restarting the server resets them to `backend/data/tasks.json`.

## Project Structure

```
techbridge-final-project/
├── package.json            starts the backend from the project root
├── README.md
├── frontend/
│   ├── index.html          landing page
│   ├── dashboard.html      intern dashboard
│   ├── challenges.html     Challenge Hub
│   ├── programs.html       programs
│   ├── internship-tasks.html
│   ├── css/style.css
│   ├── js/config.js        API address
│   ├── js/script.js        site scripts and Challenge Hub
│   ├── js/dashboard.js     dashboard, tasks, search
│   └── images/
└── backend/
    ├── server.js
    ├── package.json
    ├── routes/             tasks.js, challenges.js, search.js
    └── data/               tasks.json, challenges.json, store.js
```

## Testing Checklist

Homepage, navigation, dashboard, task loading, View Task, status updates, progress updates, Challenge Hub, filters, search, loading state, error state (stop the backend), mobile layout.
