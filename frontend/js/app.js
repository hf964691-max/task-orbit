const STORAGE_KEY = "task-orbit-tasks";

const taskList = document.querySelector("#task-list");
const addForm = document.querySelector("#add-form");
const newTaskInput = document.querySelector("#new-task");
const emptyState = document.querySelector("#empty-state");
const notice = document.querySelector("#notice");
const savedIndicator = document.querySelector("#saved-indicator");
const storageLabel = document.querySelector("#storage-label");
const storageDot = document.querySelector("#storage-dot");
const clearCompletedButton = document.querySelector("#clear-completed");
const filters = document.querySelector(".filters");

let tasks = [];
let activeFilter = "all";
let editingTaskId = null;

function showNotice(message) {
    notice.textContent = message;
}

function setStorageStatus(isSaved) {
    savedIndicator.classList.toggle("is-unsaved", !isSaved);
    storageLabel.textContent = isSaved ? "Saved on this device" : "Not saved";
    storageDot.setAttribute("aria-label", isSaved ? "Saved" : "Not saved");
}

function loadTasks() {
    try {
        const savedTasks = localStorage.getItem(STORAGE_KEY);
        if (!savedTasks) return [];

        const parsedTasks = JSON.parse(savedTasks);
        if (!Array.isArray(parsedTasks)) throw new TypeError("Saved task data is not a list.");

        const validTasks = parsedTasks.filter((task) =>
            task &&
            typeof task.id === "string" &&
            typeof task.title === "string" &&
            task.title.trim() &&
            typeof task.completed === "boolean" &&
            Number.isFinite(task.createdAt)
        );

        if (validTasks.length !== parsedTasks.length) {
            showNotice("Some saved tasks could not be loaded because their data was invalid.");
        }

        return validTasks;
    } catch (error) {
        console.error("Unable to load saved tasks:", error);
        showNotice("Saved tasks could not be loaded. You can still use the app, but check your browser storage.");
        setStorageStatus(false);
        return [];
    }
}

function saveTasks() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
        setStorageStatus(true);
        return true;
    } catch (error) {
        console.error("Unable to save tasks:", error);
        setStorageStatus(false);
        showNotice("Your changes are shown here, but couldn't be saved to this device.");
        return false;
    }
}

function createTaskId() {
    return typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function makeButton(label, className, text) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = className;
    button.setAttribute("aria-label", label);
    button.textContent = text;
    return button;
}

function renderTask(task) {
    const item = document.createElement("li");
    item.className = `task-item${task.completed ? " is-complete" : ""}`;
    item.dataset.taskId = task.id;

    if (editingTaskId === task.id) {
        const editForm = document.createElement("form");
        editForm.className = "edit-form";

        const input = document.createElement("input");
        input.type = "text";
        input.name = "title";
        input.value = task.title;
        input.maxLength = 180;
        input.required = true;
        input.setAttribute("aria-label", "Edit task");

        const saveButton = document.createElement("button");
        saveButton.type = "submit";
        saveButton.textContent = "Save";

        const cancelButton = makeButton("Cancel editing", "icon-button", "×");
        cancelButton.dataset.action = "cancel";

        editForm.append(input, saveButton, cancelButton);
        item.append(editForm);
        requestAnimationFrame(() => {
            input.focus();
            input.select();
        });
        return item;
    }

    const checkLabel = document.createElement("label");
    checkLabel.className = "task-check";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = task.completed;
    checkbox.setAttribute("aria-label", `${task.completed ? "Mark incomplete" : "Mark complete"}: ${task.title}`);

    const checkmark = document.createElement("span");
    checkmark.className = "checkmark";
    checkmark.setAttribute("aria-hidden", "true");
    checkmark.textContent = "✓";
    checkLabel.append(checkbox, checkmark);

    const copy = document.createElement("div");
    copy.className = "task-copy";
    const title = document.createElement("span");
    title.className = "task-title";
    title.textContent = task.title;
    copy.append(title);

    const actions = document.createElement("div");
    actions.className = "task-actions";
    const editButton = makeButton(`Edit ${task.title}`, "icon-button", "✎");
    editButton.dataset.action = "edit";
    const deleteButton = makeButton(`Delete ${task.title}`, "icon-button delete-button", "×");
    deleteButton.dataset.action = "delete";
    actions.append(editButton, deleteButton);

    item.append(checkLabel, copy, actions);
    return item;
}

function render() {
    const completedCount = tasks.filter((task) => task.completed).length;
    const activeCount = tasks.length - completedCount;
    const visibleTasks = tasks.filter((task) => {
        if (activeFilter === "active") return !task.completed;
        if (activeFilter === "completed") return task.completed;
        return true;
    });

    document.querySelector("#task-count").textContent = tasks.length;
    document.querySelector("#all-count").textContent = tasks.length;
    document.querySelector("#active-count").textContent = activeCount;
    document.querySelector("#completed-count").textContent = completedCount;
    clearCompletedButton.hidden = completedCount === 0;

    const progress = tasks.length ? Math.round((completedCount / tasks.length) * 100) : 0;
    document.querySelector("#progress-fill").style.width = `${progress}%`;
    document.querySelector("#progress-label").textContent = tasks.length
        ? `${completedCount} of ${tasks.length} complete`
        : "A fresh start";

    filters.querySelectorAll("[data-filter]").forEach((button) => {
        const isActive = button.dataset.filter === activeFilter;
        button.classList.toggle("is-active", isActive);
        button.setAttribute("aria-pressed", String(isActive));
    });

    taskList.replaceChildren(...visibleTasks.map(renderTask));
    emptyState.hidden = visibleTasks.length > 0;

    if (!tasks.length) {
        document.querySelector("#empty-title").textContent = "A clear orbit.";
        document.querySelector("#empty-message").textContent = "Add your first task and make today yours.";
    } else if (!visibleTasks.length) {
        document.querySelector("#empty-title").textContent = "Nothing here just yet.";
        document.querySelector("#empty-message").textContent = activeFilter === "active"
            ? "All caught up — there are no tasks in progress."
            : "Complete a task and it will find its way here.";
    }
}

function updateTask(taskId, update) {
    tasks = tasks.map((task) => task.id === taskId ? { ...task, ...update } : task);
    saveTasks();
    render();
}

addForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const title = new FormData(addForm).get("task").trim();
    if (!title) {
        showNotice("Enter a task before adding it.");
        newTaskInput.focus();
        return;
    }

    tasks.unshift({
        id: createTaskId(),
        title,
        completed: false,
        createdAt: Date.now()
    });
    activeFilter = "all";
    showNotice("");
    saveTasks();
    render();
    newTaskInput.value = "";
    newTaskInput.focus();
});

filters.addEventListener("click", (event) => {
    const button = event.target.closest("[data-filter]");
    if (!button) return;
    activeFilter = button.dataset.filter;
    editingTaskId = null;
    render();
});

taskList.addEventListener("change", (event) => {
    const checkbox = event.target.closest('input[type="checkbox"]');
    if (!checkbox) return;
    const item = checkbox.closest("[data-task-id]");
    if (item) updateTask(item.dataset.taskId, { completed: checkbox.checked });
});

taskList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-action]");
    if (!button) return;

    const item = button.closest("[data-task-id]");
    if (!item) return;
    const taskId = item.dataset.taskId;

    if (button.dataset.action === "edit") {
        editingTaskId = taskId;
        showNotice("");
        render();
    } else if (button.dataset.action === "delete") {
        tasks = tasks.filter((task) => task.id !== taskId);
        showNotice("");
        saveTasks();
        render();
    } else if (button.dataset.action === "cancel") {
        editingTaskId = null;
        render();
    }
});

taskList.addEventListener("submit", (event) => {
    const editForm = event.target.closest(".edit-form");
    if (!editForm) return;
    event.preventDefault();

    const title = new FormData(editForm).get("title").trim();
    if (!title) {
        showNotice("A task can't be empty.");
        editForm.elements.title.focus();
        return;
    }

    const item = editForm.closest("[data-task-id]");
    tasks = tasks.map((task) => task.id === item.dataset.taskId ? { ...task, title } : task);
    editingTaskId = null;
    showNotice("");
    saveTasks();
    render();
});

taskList.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || !event.target.closest(".edit-form")) return;
    editingTaskId = null;
    showNotice("");
    render();
});

clearCompletedButton.addEventListener("click", () => {
    tasks = tasks.filter((task) => !task.completed);
    showNotice("");
    saveTasks();
    render();
});

document.querySelector("#today-date").textContent = new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric"
}).format(new Date()).toUpperCase();
document.querySelector("#footer-year").textContent = new Date().getFullYear();
tasks = loadTasks();
render();
