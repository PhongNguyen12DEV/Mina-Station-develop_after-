/* ============================================================
   DOM REFS — dùng chung cho mọi module
   ============================================================ */
export const messages = document.getElementById("messages");
export const welcome = document.getElementById("welcome");
export const form = document.getElementById("chatForm");
export const input = document.getElementById("messageInput");
export const sendButton = document.getElementById("sendButton");

export const chatPage = document.getElementById("chatPage");
export const placeholderPage = document.getElementById("placeholderPage");
export const placeholderTitle = document.getElementById("placeholderTitle");

/* --- Workspace pages --- */
export const todoPage = document.getElementById("todoPage");
export const doctorPage = document.getElementById("doctorPage");

/* --- Todo elements --- */
export const todoInput = document.getElementById("todoInput");
export const todoAdd = document.getElementById("todoAdd");
export const todoList = document.getElementById("todoList");
export const todoEmpty = document.getElementById("todoEmpty");
export const todoClearDone = document.getElementById("todoClearDone");

/* --- Doctor elements --- */
export const doctorGrid = document.getElementById("doctorGrid");
export const doctorRunAll = document.getElementById("doctorRunAll");

export const sidebar = document.getElementById("sidebar");
export const overlay = document.getElementById("sidebarOverlay");

export const userCard = document.getElementById("userCard");
export const configModal = document.getElementById("configModal");
export const configBody = document.getElementById("configBody");
export const configClose = document.getElementById("configClose");
export const configCancel = document.getElementById("configCancel");
export const configApply = document.getElementById("configApply");
export const configSource = document.getElementById("configSource");

export const modelName = document.getElementById("modelName");

/* ============================================================
   SHARED STATE
   ============================================================ */
export const state = {
    busy: false
};