const STORAGE_KEY = "task-orbit-tasks";

const taskList = document.querySelector("#task-list");
const addForm = document.querySelector("#add-form");
const newTaskInput = document.querySelector("#new-task");
const taskSearch = document.querySelector("#task-search");
const clearSearchButton = document.querySelector("#clear-search");
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
let searchQuery = "";
const priorities = ["high", "medium", "low"];

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

        return validTasks.map((task) => ({
            ...task,
            dueDate: isValidDate(task.dueDate) ? task.dueDate : "",
            priority: priorities.includes(task.priority) ? task.priority : ""
        }));
    } catch (error) {
        console.error("Unable to load saved tasks:", error);
        showNotice("Saved tasks could not be loaded. You can still use the app, but check your browser storage.");
        setStorageStatus(false);
        return [];
    }
}

function isValidDate(value) {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

function formatDueDate(value) {
    const [year, month, day] = value.split("-").map(Number);
    return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" })
        .format(new Date(year, month - 1, day));
}

function todayAsDateString() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
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

function makeOptionField(label, name, value, options = null) {
    const wrapper = document.createElement("label");
    wrapper.className = `task-option ${name === "dueDate" ? "date-option" : "priority-option"}`;

    const icon = document.createElement("span");
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = name === "dueDate" ? "◷" : "⚑";

    const control = options ? document.createElement("select") : document.createElement("input");
    control.name = name;
    control.setAttribute("aria-label", label);
    control.value = value || "";

    if (options) {
        options.forEach(({ value: optionValue, label: optionLabel }) => {
            const option = document.createElement("option");
            option.value = optionValue;
            option.textContent = optionLabel;
            control.append(option);
        });
    } else {
        control.type = "date";
    }

    wrapper.append(icon, control);
    return wrapper;
}

function renderTask(task) {
    const item = document.createElement("li");
    item.className = `task-item${task.completed ? " is-complete" : ""}`;
    item.dataset.taskId = task.id;

    if (editingTaskId === task.id) {
        const editForm = document.createElement("form");
        editForm.className = "edit-form";

        const editMain = document.createElement("div");
        editMain.className = "edit-main";
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

        editMain.append(input, saveButton, cancelButton);
        const editOptions = document.createElement("div");
        editOptions.className = "edit-options";
        editOptions.append(
            makeOptionField("Due date", "dueDate", task.dueDate),
            makeOptionField("Priority", "priority", task.priority, [
                { value: "", label: "No priority" },
                { value: "high", label: "High priority" },
                { value: "medium", label: "Medium priority" },
                { value: "low", label: "Low priority" }
            ])
        );
        editForm.append(editMain, editOptions);
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

    const metadata = document.createElement("div");
    metadata.className = "task-meta";
    if (task.priority && priorities.includes(task.priority)) {
        const priorityBadge = document.createElement("span");
        priorityBadge.className = `task-badge priority-${task.priority}`;
        priorityBadge.textContent = `${task.priority[0].toUpperCase()}${task.priority.slice(1)} priority`;
        metadata.append(priorityBadge);
    }
    if (isValidDate(task.dueDate)) {
        const dueBadge = document.createElement("span");
        const isOverdue = !task.completed && task.dueDate < todayAsDateString();
        dueBadge.className = `task-badge${isOverdue ? " is-overdue" : ""}`;
        dueBadge.textContent = `${isOverdue ? "Overdue · " : "Due "}${formatDueDate(task.dueDate)}`;
        metadata.append(dueBadge);
    }
    if (metadata.childElementCount) copy.append(metadata);

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
    const statusFilteredTasks = tasks.filter((task) => {
        if (activeFilter === "active") return !task.completed;
        if (activeFilter === "completed") return task.completed;
        return true;
    });
    const query = searchQuery.trim().toLocaleLowerCase();
    const visibleTasks = statusFilteredTasks.filter((task) => {
        if (!query) return true;
        const searchableText = [
            task.title,
            task.priority,
            task.dueDate,
            isValidDate(task.dueDate) ? formatDueDate(task.dueDate) : ""
        ].join(" ").toLocaleLowerCase();
        return searchableText.includes(query);
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

    clearSearchButton.hidden = !searchQuery;
    taskList.replaceChildren(...visibleTasks.map(renderTask));
    emptyState.hidden = visibleTasks.length > 0;

    if (query) {
        document.querySelector("#empty-title").textContent = "No matching tasks.";
        document.querySelector("#empty-message").textContent = "Try another search or clear the search field.";
    } else if (!tasks.length) {
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
    const formData = new FormData(addForm);
    const title = formData.get("task").trim();
    if (!title) {
        showNotice("Enter a task before adding it.");
        newTaskInput.focus();
        return;
    }

    tasks.unshift({
        id: createTaskId(),
        title,
        completed: false,
        createdAt: Date.now(),
        dueDate: formData.get("dueDate"),
        priority: formData.get("priority")
    });
    activeFilter = "all";
    showNotice("");
    saveTasks();
    render();
    addForm.reset();
    newTaskInput.focus();
});

filters.addEventListener("click", (event) => {
    const button = event.target.closest("[data-filter]");
    if (!button) return;
    activeFilter = button.dataset.filter;
    editingTaskId = null;
    render();
});

taskSearch.addEventListener("input", () => {
    searchQuery = taskSearch.value;
    editingTaskId = null;
    render();
});

clearSearchButton.addEventListener("click", () => {
    taskSearch.value = "";
    searchQuery = "";
    render();
    taskSearch.focus();
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

    const formData = new FormData(editForm);
    const title = formData.get("title").trim();
    if (!title) {
        showNotice("A task can't be empty.");
        editForm.elements.title.focus();
        return;
    }
    const item = editForm.closest("[data-task-id]");
    tasks = tasks.map((task) => task.id === item.dataset.taskId ? {
        ...task,
        title,
        dueDate: formData.get("dueDate"),
        priority: formData.get("priority")
    } : task);
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
