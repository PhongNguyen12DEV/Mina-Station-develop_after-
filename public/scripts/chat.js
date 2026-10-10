import {
    messages,
    welcome,
    form,
    input,
    sendButton,
    state
} from "./dom.js";

/* ============================================================
   HELPERS
   ============================================================ */
function scrollToBottom() {
    messages.scrollTop = messages.scrollHeight;
}

function createMessage(role, content) {
    const isUser = role === "user";

    const row = document.createElement("article");
    row.className = `message-row ${role}`;

    const avatar = document.createElement("div");
    avatar.className = "message-avatar";

    const img = document.createElement("img");
    img.src = isUser ? "/assets/user.png" : "/assets/maid.png";
    img.alt = isUser ? "User" : "Mina";

    img.onerror = () => {
        img.remove();
        avatar.textContent = isUser ? "U" : "✿";
    };

    avatar.appendChild(img);

    const wrapper = document.createElement("div");
    wrapper.className = "message-content";

    const name = document.createElement("div");
    name.className = "message-name";
    name.textContent = isUser ? "You" : "Mina";

    const bubble = document.createElement("div");
    bubble.className = "message-bubble";
    bubble.textContent = content;

    wrapper.append(name, bubble);
    row.append(avatar, wrapper);

    return row;
}

function showTyping() {
    const row = document.createElement("article");
    row.className = "message-row assistant";
    row.id = "typingIndicator";

    const avatar = document.createElement("div");
    avatar.className = "message-avatar";

    const img = document.createElement("img");
    img.src = "/assets/maid.png";
    img.alt = "Mina";
    img.onerror = () => {
        img.remove();
        avatar.textContent = "✿";
    };
    avatar.appendChild(img);

    const wrapper = document.createElement("div");
    wrapper.className = "message-content";

    const name = document.createElement("div");
    name.className = "message-name";
    name.textContent = "Mina";

    const dots = document.createElement("div");
    dots.className = "typing";

    for (let i = 0; i < 3; i++) {
        dots.appendChild(document.createElement("span"));
    }

    wrapper.append(name, dots);
    row.append(avatar, wrapper);
    messages.appendChild(row);

    scrollToBottom();
}

function removeTyping() {
    document.getElementById("typingIndicator")?.remove();
}

function resizeInput() {
    input.style.height = "auto";
    input.style.height = `${Math.min(input.scrollHeight, 180)}px`;
}

/* ============================================================
   SEND MESSAGE
   ============================================================ */
export async function sendMessage(text) {
    const message = text.trim();

    if (!message || state.busy) return;

    state.busy = true;
    sendButton.disabled = true;
    welcome.hidden = true;

    messages.appendChild(createMessage("user", message));
    input.value = "";
    resizeInput();
    showTyping();

    try {
        const response = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Request thất bại.");
        }

        if (typeof data.reply !== "string") {
            throw new Error("Server trả về dữ liệu không hợp lệ.");
        }

        removeTyping();
        messages.appendChild(createMessage("assistant", data.reply));
    } catch (error) {
        removeTyping();
        messages.appendChild(
            createMessage(
                "assistant",
                `⚠️ ${error.message}\n\nAnh kiểm tra API giúp em nhé.`
            )
        );
    } finally {
        state.busy = false;
        sendButton.disabled = false;
        input.focus();
        scrollToBottom();
    }
}

/* ============================================================
   RESET CHAT UI (dùng cho New chat)
   ============================================================ */
export function resetChatUI() {
    messages.replaceChildren(welcome);
    welcome.hidden = false;
    input.value = "";
    resizeInput();
}

/* ============================================================
   INIT EVENTS
   ============================================================ */
export function initChat() {
    form.addEventListener("submit", (event) => {
        event.preventDefault();
        sendMessage(input.value);
    });

    input.addEventListener("input", resizeInput);

    input.addEventListener("keydown", (event) => {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            form.requestSubmit();
        }
    });

    document.querySelectorAll(".suggestion").forEach((button) => {
        button.addEventListener("click", () => {
            sendMessage(button.dataset.prompt || "");
        });
    });
}