import { initChat } from "./chat.js";
import { initSidebar } from "./sidebar.js";
import { initConfig, initModelName } from "./config.js";
import { initTodo } from "./todo.js";
import { initDoctor } from "./doctor.js";

/* ============================================================
   BOOTSTRAP
   ============================================================ */
initChat();
initSidebar();
initConfig();
initModelName();
initTodo();
initDoctor();