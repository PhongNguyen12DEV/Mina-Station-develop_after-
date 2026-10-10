import {
    sidebar,
    overlay,
    chatPage,
    placeholderPage,
    placeholderTitle,
    todoPage,
    doctorPage
} from "./dom.js";

import { resetChatUI } from "./chat.js";

/* ============================================================
   SIDEBAR OPEN/CLOSE
   ============================================================ */
export function closeSidebar() {
    sidebar.classList.remove("open");
    overlay.classList.remove("visible");
}

function openSidebar() {
    sidebar.classList.add("open");
    overlay.classList.add("visible");
}

/* ============================================================
   PAGE NAV
   ============================================================ */
function hideAllPages() {
    chatPage.hidden = true;
    todoPage.hidden = true;
    doctorPage.hidden = true;
    placeholderPage.hidden = true;
}

function setActiveNav(page) {
    document.querySelectorAll(".nav-item").forEach((item) => {
        item.classList.toggle("active", item.dataset.page === page);
    });
}

export function showChat() {
    hideAllPages();
    chatPage.hidden = false;
    setActiveNav("chat");
    closeSidebar();
}

function showTodo() {
    hideAllPages();
    todoPage.hidden = false;
    setActiveNav("todo");
    closeSidebar();
}

function showDoctor() {
    hideAllPages();
    doctorPage.hidden = false;
    setActiveNav("doctor");
    closeSidebar();
}

function showPlaceholder(page) {
    placeholderTitle.textContent =
        page === "placeholder1" ? "Placeholder One" : "Placeholder Two";

    hideAllPages();
    placeholderPage.hidden = false;
    setActiveNav(page);
}

/* ============================================================
   INIT
   ============================================================ */
export function initSidebar() {
    document.getElementById("newChat").addEventListener("click", () => {
        resetChatUI();
        showChat();
        document.getElementById("messageInput").focus();
    });

    document.querySelectorAll(".nav-item").forEach((button) => {
        button.addEventListener("click", () => {
            const page = button.dataset.page;

            if (page === "chat") return showChat();
            if (page === "todo") return showTodo();
            if (page === "doctor") return showDoctor();

            showPlaceholder(page);
        });
    });

    document.getElementById("backChat").addEventListener("click", showChat);

    document.getElementById("menuButton").addEventListener("click", openSidebar);
    document.getElementById("closeSidebar").addEventListener("click", closeSidebar);
    overlay.addEventListener("click", closeSidebar);
}