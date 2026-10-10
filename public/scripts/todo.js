// todo.js
import {
    todoInput,
    todoAdd,
    todoList,
    todoEmpty,
    todoClearDone
} from "./dom.js";

const STORAGE_KEY = "mina.todos";

let todos = loadTodos();
let currentFilter = "all";

/* ============================================================
   STORAGE
   ============================================================ */
function loadTodos() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

function saveTodos() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
    } catch {
        /* ignore */
    }
}

/* ============================================================
   RENDER
   ============================================================ */
function render() {
    const filtered = todos.filter(t => {
        if (currentFilter === "active") return !t.done;
        if (currentFilter === "done") return t.done;
        return true;
    });

    todoList.replaceChildren();

    if (filtered.length === 0) {
        todoEmpty.hidden = false;
        return;
    }
    todoEmpty.hidden = true;

    for (const todo of filtered) {
        todoList.appendChild(renderItem(todo));
    }
}

function renderItem(todo) {
    const li = document.createElement("li");
    li.className = "todo-item" + (todo.done ? " done" : "");
    li.dataset.id = todo.id;

    // Checkbox
    const check = document.createElement("button");
    check.className = "todo-check";
    check.setAttribute("aria-label", todo.done ? "Đánh dấu chưa xong" : "Đánh dấu xong");
    check.textContent = todo.done ? "✓" : "";
    check.addEventListener("click", () => toggleTodo(todo.id));

    // Text
    const text = document.createElement("span");
    text.className = "todo-text";
    text.textContent = todo.text;
    text.addEventListener("dblclick", () => editTodo(todo.id));

    // Delete
    const del = document.createElement("button");
    del.className = "todo-delete";
    del.setAttribute("aria-label", "Xoá");
    del.textContent = "✕";
    del.addEventListener("click", () => deleteTodo(todo.id));

    li.append(check, text, del);
    return li;
}

/* ============================================================
   ACTIONS
   ============================================================ */
function addTodo(text) {
    const value = text.trim();
    if (!value) return;

    todos.unshift({
        id: crypto.randomUUID(),
        text: value,
        done: false,
        createdAt: Date.now()
    });

    saveTodos();
    render();
}

function toggleTodo(id) {
    const t = todos.find(x => x.id === id);
    if (!t) return;
    t.done = !t.done;
    saveTodos();
    render();
}

function deleteTodo(id) {
    todos = todos.filter(x => x.id !== id);
    saveTodos();
    render();
}

function editTodo(id) {
    const t = todos.find(x => x.id === id);
    if (!t) return;

    const li = todoList.querySelector(`[data-id="${id}"]`);
    const textEl = li?.querySelector(".todo-text");
    if (!textEl) return;

    const original = t.text;
    textEl.contentEditable = "true";
    textEl.focus();

    // Chọn toàn bộ text
    const range = document.createRange();
    range.selectNodeContents(textEl);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);

    const finish = (save) => {
        textEl.contentEditable = "false";
        const newText = textEl.textContent.trim();
        if (save && newText) {
            t.text = newText;
            saveTodos();
        } else {
            textEl.textContent = original;
        }
    };

    textEl.addEventListener("blur", () => finish(true), { once: true });
    textEl.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            textEl.blur();
        } else if (e.key === "Escape") {
            e.preventDefault();
            finish(false);
            textEl.blur();
        }
    });
}

function clearDone() {
    todos = todos.filter(t => !t.done);
    saveTodos();
    render();
}

/* ============================================================
   INIT
   ============================================================ */
export function initTodo() {
    // Add button
    todoAdd.addEventListener("click", () => {
        addTodo(todoInput.value);
        todoInput.value = "";
        todoInput.focus();
    });

    // Enter để thêm
    todoInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            addTodo(todoInput.value);
            todoInput.value = "";
        }
    });

    // Clear done
    todoClearDone.addEventListener("click", clearDone);

    // Filter
    document.querySelectorAll(".filter-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            currentFilter = btn.dataset.filter;
            document.querySelectorAll(".filter-btn").forEach(b =>
                b.classList.toggle("active", b === btn)
            );
            render();
        });
    });

    render();
}