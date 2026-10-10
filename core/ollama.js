const DEFAULT_HISTORY_LIMIT = 20;

const history = [];

function getConfig(cfg) {
    return cfg || {};
}

function resetChat() {
    history.length = 0;
}

async function chat(message, cfg) {
    if (typeof message !== "string" || !message.trim()) {
        throw new Error("Tin nhắn không được để trống!");
    }

    const { PERSONAL = {}, ARGS = {} } = cfg || {};

    if (!ARGS.base_url || !ARGS.model) {
        throw new Error("Thiếu cấu hình ARGS (base_url/model) trong maid.json.");
    }

    const systemMessage = {
        role: "system",
        content: [
            PERSONAL.system || "",
            `Tên trợ lý: ${PERSONAL.name || "Mina"}`,
            `Vai trò: ${PERSONAL.role || ""}`,
            `Tính cách: ${(PERSONAL.personality || []).join(", ")}`,
            `Ngôn ngữ: ${PERSONAL.language || "vi-VN"}`,
            `Người dùng: ${PERSONAL.user_name || "Anh"}`,
            `Quy tắc: ${(PERSONAL.rules || []).join("; ")}`
        ]
            .filter(Boolean)
            .join("\n")
    };

    const userMessage = {
        role: "user",
        content: message.trim()
    };

    const messages = [
        systemMessage,
        ...history,
        userMessage
    ];

    const endpoint = `${ARGS.base_url}${ARGS.endpoint || "/api/chat"}`;

    const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            model: ARGS.model,
            messages,
            stream: false,
            think: ARGS.think ?? false,
            keep_alive: ARGS.keep_alive || "5m",
            options: ARGS.options || {}
        }),
        signal: AbortSignal.timeout(ARGS.timeout || 120000)
    });

    if (!response.ok) {
        throw new Error(
            `Ollama HTTP ${response.status}: ${await response.text()}`
        );
    }

    const data = await response.json();
    const answer = data.message?.content;

    if (typeof answer !== "string") {
        throw new Error("Ollama không trả về nội dung hợp lệ.");
    }

    history.push(userMessage, {
        role: "assistant",
        content: answer
    });

    // Cắt lịch sử nếu quá dài
    const maxPairs = DEFAULT_HISTORY_LIMIT * 2;
    if (history.length > maxPairs) {
        history.splice(0, history.length - maxPairs);
    }

    return answer;
}

module.exports = {
    chat,
    getConfig,
    resetChat
};