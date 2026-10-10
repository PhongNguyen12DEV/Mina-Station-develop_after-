// gemini.js
const DEFAULT_HISTORY_LIMIT = 20;

// Fallback models — thử lần lượt nếu model chính lỗi 503/429
const FALLBACK_MODELS = [
    "gemini-2.5-flash",
    "gemini-2.0-flash"
];

const history = [];

function getConfig(cfg) {
    return cfg || {};
}

function resetChat() {
    history.length = 0;
}

/* ============================================================
   HELPERS
   ============================================================ */

function buildSystemPrompt(PERSONAL = {}) {
    return [
        PERSONAL.system || "",
        `Tên trợ lý: ${PERSONAL.name || "Mina"}`,
        `Vai trò: ${PERSONAL.role || ""}`,
        `Tính cách: ${(PERSONAL.personality || []).join(", ")}`,
        `Ngôn ngữ: ${PERSONAL.language || "vi-VN"}`,
        `Người dùng: ${PERSONAL.user_name || "Anh"}`,
        `Quy tắc: ${(PERSONAL.rules || []).join("; ")}`
    ]
        .filter(Boolean)
        .join("\n");
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Fetch với retry + exponential backoff.
 * Chỉ retry khi gặp lỗi 5xx (server) hoặc network error.
 * KHÔNG retry lỗi 4xx (client sai) vì retry cũng vô ích.
 */
async function fetchWithRetry(url, options, maxRetries = 4) {
    let lastError;
    let lastStatus = 0;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            const response = await fetch(url, options);

            // Thành công hoặc lỗi client (4xx) → trả về luôn
            if (response.ok || (response.status >= 400 && response.status < 500)) {
                return response;
            }

            // Lỗi 5xx → có thể retry
            lastStatus = response.status;
            lastError = new Error(`HTTP ${response.status}`);
        } catch (err) {
            // Network error, timeout → retry
            lastError = err;
        }

        // Nếu còn lượt retry → chờ rồi thử lại
        if (attempt < maxRetries) {
            const delay = Math.min(1000 * Math.pow(2, attempt), 16000)
                + Math.floor(Math.random() * 500);
            console.warn(
                `[Gemini] Thử lại lần ${attempt + 1}/${maxRetries} sau ${delay}ms (status=${lastStatus || "network"})`
            );
            await sleep(delay);
        }
    }

    throw lastError || new Error("Fetch thất bại sau nhiều lần thử.");
}

/* ============================================================
   BUILD REQUEST BODY (Interactions API)
   ============================================================ */
function buildRequestBody(model, systemPrompt, message, ARGS) {
    const input = [];

    if (systemPrompt) {
        input.push({
            type: "user_input",
            content: [{ type: "text", text: `[SYSTEM]\n${systemPrompt}` }]
        });
    }

    for (const msg of history) {
        input.push({
            type: "user_input",
            content: [{ type: "text", text: msg.content }]
        });
    }

    input.push({
        type: "user_input",
        content: [{ type: "text", text: message.trim() }]
    });

    const body = { model, input };

    if (ARGS.options && Object.keys(ARGS.options).length > 0) {
        const gc = {
            temperature: ARGS.options.temperature,
            top_p: ARGS.options.top_p,
            top_k: ARGS.options.top_k,
            max_output_tokens: ARGS.options.num_predict
        };
        Object.keys(gc).forEach(k => gc[k] === undefined && delete gc[k]);
        if (Object.keys(gc).length > 0) body.generation_config = gc;
    }

    return body;
}

/* ============================================================
   PARSE RESPONSE (Interactions API)
   ============================================================ */
function parseResponse(data) {
    let answer = "";

    if (Array.isArray(data.steps)) {
        for (const step of data.steps) {
            if (step.type === "model_output" && Array.isArray(step.content)) {
                for (const c of step.content) {
                    if (c.type === "text" && typeof c.text === "string") {
                        answer += c.text;
                    }
                }
            }
        }
    }

    if (!answer && typeof data.output_text === "string") {
        answer = data.output_text;
    }

    return answer;
}

/* ============================================================
   CHAT — entrypoint chính
   ============================================================ */
async function chat(message, cfg) {
    if (typeof message !== "string" || !message.trim()) {
        throw new Error("Tin nhắn không được để trống!");
    }

    const { PERSONAL = {}, ARGS = {} } = cfg || {};

    if (!ARGS.api_key) {
        throw new Error(
            "Thiếu API key. Vào cấu hình để nhập Gemini API key của bạn."
        );
    }
    if (!ARGS.model) {
        throw new Error("Thiếu cấu hình model trong maid.json.");
    }

    const systemPrompt = buildSystemPrompt(PERSONAL);
    const baseUrl = (ARGS.base_url || "https://generativelanguage.googleapis.com")
        .replace(/\/+$/, "");
    const endpoint = `${baseUrl}/v1beta/interactions`;

    // Danh sách model thử lần lượt: model chính + fallback
    const modelsToTry = [ARGS.model, ...FALLBACK_MODELS.filter(m => m !== ARGS.model)];

    let lastError = null;
    let lastStatus = 0;

    for (const model of modelsToTry) {
        try {
            const body = buildRequestBody(model, systemPrompt, message, ARGS);

            const response = await fetchWithRetry(endpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-goog-api-key": ARGS.api_key
                },
                body: JSON.stringify(body),
                signal: AbortSignal.timeout(ARGS.timeout || 120000)
            });

            if (!response.ok) {
                const errText = await response.text();
                lastStatus = response.status;
                lastError = new Error(`Gemini HTTP ${response.status}: ${errText}`);

                // 503/429 → thử model tiếp theo
                if (response.status === 503 || response.status === 429) {
                    console.warn(`[Gemini] Model ${model} quá tải, thử model khác...`);
                    continue;
                }
                // 4xx khác → dừng, không cần thử model khác
                throw lastError;
            }

            const data = await response.json();
            const answer = parseResponse(data);

            if (!answer) {
                const reason = data.status || "unknown";
                lastError = new Error(
                    `Gemini không trả về nội dung hợp lệ (model=${model}, status=${reason}).`
                );
                continue;
            }

            // Thành công → lưu history
            history.push({ role: "user", content: message.trim() });
            history.push({ role: "assistant", content: answer });

            const maxPairs = DEFAULT_HISTORY_LIMIT * 2;
            if (history.length > maxPairs) {
                history.splice(0, history.length - maxPairs);
            }

            return answer;

        } catch (err) {
            lastError = err;
            console.warn(`[Gemini] Model ${model} lỗi: ${err.message}`);
        }
    }

    // Hết model để thử
    const suffix = lastStatus === 503
        ? "\n\n💡 Server Gemini đang quá tải. Anh thử lại sau vài giây nhé."
        : "";
    throw new Error((lastError?.message || "Không gọi được Gemini.") + suffix);
}

module.exports = {
    chat,
    getConfig,
    resetChat
};