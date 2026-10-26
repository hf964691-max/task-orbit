# Task Orbit

Task Orbit is a lightweight, responsive task manager built with plain HTML, CSS, and JavaScript. Organize everyday work, set due dates and priorities, and keep your list available in the browser without an account or a server.

## Features

- Create, edit, and delete tasks.
- Mark tasks complete or return them to in progress.
- Set an optional due date and priority (high, medium, or low) when creating or editing a task.
- See due dates and priority at a glance; overdue dates are highlighted.
- Search task titles, priorities, and due dates as you type.
- Filter tasks by all, in progress, or completed.
- Clear all completed tasks at once.
- Automatically save tasks in the browser's local storage.
- Responsive layout and keyboard-accessible controls.

## Getting started

No package installation or build step is required.

1. Clone or download this project.
2. Open `frontend/index.html` in a modern browser.

For a local web server instead, run this from the project root:

```sh
python3 -m http.server 8000 --directory frontend
```

Then visit [http://localhost:8000](http://localhost:8000).

## Using the app

Enter a task in the input field. Due dates and priority are optional and can be selected before adding the task. Search by task title, priority, or due date, and combine search with a status filter. Use the checkbox to update a task's completion status, or choose its edit or delete action. The filter controls show all tasks, only tasks in progress, or only completed tasks.

Task changes are saved automatically under the `task-orbit-tasks` key in local storage. Data stays in the current browser and origin; it is not synced between browsers or devices. Clearing browser site data also removes saved tasks.

## Project structure

```text
frontend/
├── index.html       # App markup
├── css/
│   └── style.css    # Responsive styles
└── js/
    └── app.js       # Task behavior and local storage
```

## Technology

- HTML5
- CSS3
- Vanilla JavaScript
- Browser local storage

The interface uses DM Sans and Manrope when available, with system-friendly sans-serif fallbacks.
