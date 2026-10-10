import {
    sidebar,
    overlay,
    chatPage,
    placeholderPage,
    placeholderTitle
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
export function showChat() {
    chatPage.hidden = false;
    placeholderPage.hidden = true;

    document.querySelectorAll(".nav-item").forEach((item) => {
        item.classList.toggle("active", item.dataset.page === "chat");
    });

    closeSidebar();
}

function showPlaceholder(page) {
    placeholderTitle.textContent =
        page === "placeholder1"
            ? "Placeholder One"
            : "Placeholder Two";

    chatPage.hidden = true;
    placeholderPage.hidden = false;
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

            if (page === "chat") {
                showChat();
                return;
            }

            showPlaceholder(page);

            document.querySelectorAll(".nav-item").forEach((item) => {
                item.classList.toggle("active", item === button);
            });

            closeSidebar();
        });
    });

    document.getElementById("backChat").addEventListener("click", showChat);

    document.getElementById("menuButton").addEventListener("click", openSidebar);
    document.getElementById("closeSidebar").addEventListener("click", closeSidebar);
    overlay.addEventListener("click", closeSidebar);
}