import {
    userCard,
    configModal,
    configBody,
    configClose,
    configCancel,
    configApply,
    configSource,
    modelName
} from "./dom.js";

let currentConfig = null;

/* ============================================================
   OPEN / CLOSE MODAL
   ============================================================ */
function openModal() {
    configModal.hidden = false;
    document.body.style.overflow = "hidden";
}

function closeModal() {
    configModal.hidden = true;
    document.body.style.overflow = "";
    currentConfig = null;
}

/* ============================================================
   HELPERS
   ============================================================ */
function el(tag, attrs = {}, children = []) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
        if (k === "class") node.className = v;
        else if (k === "text") node.textContent = v;
        else if (k.startsWith("on") && typeof v === "function") {
            node.addEventListener(k.slice(2).toLowerCase(), v);
        } else if (v !== undefined && v !== null) {
            node.setAttribute(k, v);
        }
    }
    for (const c of [].concat(children)) {
        if (c) node.appendChild(c);
    }
    return node;
}

function field(labelText, value, onChange, opts = {}) {
    const id = `cfg_${Math.random().toString(36).slice(2, 9)}`;
    const isTextarea = !!opts.textarea;

    const input = isTextarea
        ? el("textarea", { id, rows: 3 })
        : el("input", {
              id,
              type: opts.type || "text",
              ...(opts.step ? { step: opts.step } : {}),
              ...(opts.placeholder ? { placeholder: opts.placeholder } : {})
          });

    input.value = value ?? "";

    input.addEventListener("input", () => {
        onChange(input.value);
    });

    return el("div", { class: "config-field" }, [
        el("label", { for: id, text: labelText }),
        input,
        opts.hint ? el("small", { text: opts.hint }) : null
    ]);
}

function section(title, children) {
    return el("div", { class: "config-section" }, [
        el("h3", { text: title }),
        ...[].concat(children)
    ]);
}

/* ============================================================
   RENDER FORM
   ============================================================ */
function renderConfig(cfg) {
    configBody.replaceChildren();

    const P = cfg.PERSONAL || (cfg.PERSONAL = {});
    const A = cfg.ARGS || (cfg.ARGS = {});
    const O = A.options || (A.options = {});

    /* --- PERSONAL --- */
    const personalSection = section("PERSONAL", [
        field("Tên trợ lý", P.name, v => (P.name = v)),
        field("Vai trò", P.role, v => (P.role = v)),
        field("Ngôn ngữ", P.language, v => (P.language = v)),
        field("Tên người dùng", P.user_name, v => (P.user_name = v)),
        field(
            "Tính cách (cách nhau dấu phẩy)",
            (P.personality || []).join(", "),
            v =>
                (P.personality = v
                    .split(",")
                    .map(s => s.trim())
                    .filter(Boolean))
        ),
        field("System prompt", P.system, v => (P.system = v), { textarea: true }),
        field("Backstory", P.backstory, v => (P.backstory = v), { textarea: true }),
        field(
            "Quy tắc (mỗi dòng 1 quy tắc)",
            (P.rules || []).join("\n"),
            v =>
                (P.rules = v
                    .split("\n")
                    .map(s => s.trim())
                    .filter(Boolean)),
            { textarea: true }
        )
    ]);

    /* --- ARGS (Gemini) --- */
    const argsSection = section("ARGS", [
        field("Provider", A.provider, v => (A.provider = v), {
            hint: "gemini"
        }),
        field("Base URL", A.base_url, v => (A.base_url = v), {
            hint: "https://generativelanguage.googleapis.com"
        }),
        field("Model", A.model, v => (A.model = v), {
            hint: "gemini-2.0-flash / gemini-2.5-flash / gemini-2.5-pro"
        }),
        field("API key", A.api_key, v => (A.api_key = v), {
            type: "password",
            placeholder: "AIza...",
            hint: "Lấy tại https://aistudio.google.com/apikey"
        }),
        field("Timeout (ms)", A.timeout, v => (A.timeout = Number(v) || 0), {
            type: "number"
        })
    ]);

    /* --- ARGS.options (Gemini generationConfig) --- */
    const optionKeys = [
        "temperature",
        "top_p",
        "top_k",
        "num_predict"
    ];

    const optionsSection = section(
        "ARGS.options",
        optionKeys.map(k =>
            field(
                k,
                O[k],
                v => {
                    const num = Number(v);
                    O[k] = Number.isNaN(num) ? v : num;
                },
                { type: "number", step: "any" }
            )
        )
    );

    configBody.append(personalSection, argsSection, optionsSection);
    currentConfig = cfg;
}

/* ============================================================
   LOAD CONFIG
   ============================================================ */
async function loadConfig() {
    configBody.replaceChildren(
        el("div", { class: "config-loading", text: "Đang tải cấu hình…" })
    );

    try {
        const res = await fetch("/api/config");
        const data = await res.json();

        if (!res.ok) throw new Error(data.error || "Không tải được config.");

        renderConfig(data.config);
        configSource.textContent = data.hasUserConfig
            ? "Nguồn: .maid/maid.json"
            : "Nguồn: json/maid.example.json (mặc định)";
    } catch (err) {
        configBody.replaceChildren(
            el("div", {
                class: "config-loading",
                text: `⚠️ ${err.message}`
            })
        );
    }
}

/* ============================================================
   APPLY CONFIG
   ============================================================ */
async function applyConfig() {
    if (!currentConfig) return;

    configApply.disabled = true;
    configApply.textContent = "Đang lưu…";

    try {
        const res = await fetch("/api/config", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(currentConfig)
        });

        const data = await res.json();

        if (!res.ok) throw new Error(data.error || "Lưu thất bại.");

        configSource.textContent = data.fallback
            ? "Đã xoá config — dùng mặc định."
            : "Đã lưu vào .maid/maid.json";

        renderConfig(data.config);

        if (modelName && data.config?.ARGS?.model) {
            modelName.textContent = data.config.ARGS.model;
        }

        setTimeout(closeModal, 400);
    } catch (err) {
        alert(`⚠️ ${err.message}`);
    } finally {
        configApply.disabled = false;
        configApply.textContent = "Áp dụng";
    }
}

/* ============================================================
   INIT
   ============================================================ */
export function initConfig() {
    userCard.addEventListener("click", () => {
        openModal();
        loadConfig();
    });

    userCard.addEventListener("keydown", e => {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openModal();
            loadConfig();
        }
    });

    configClose.addEventListener("click", closeModal);
    configCancel.addEventListener("click", closeModal);
    configModal.addEventListener("click", e => {
        if (e.target === configModal) closeModal();
    });
    document.addEventListener("keydown", e => {
        if (e.key === "Escape" && !configModal.hidden) closeModal();
    });

    configApply.addEventListener("click", applyConfig);
}

/* ============================================================
   HIỂN THỊ MODEL NAME TRÊN TOPBAR
   ============================================================ */
export async function initModelName() {
    try {
        const res = await fetch("/api/config");
        const data = await res.json();
        if (modelName && data.config?.ARGS?.model) {
            modelName.textContent = data.config.ARGS.model;
        }
    } catch {
        /* im lặng */
    }
}