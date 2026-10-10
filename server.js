// server.js
const express = require("express");
const path = require("node:path");
const fs = require("node:fs");

const { generateReply, readConfig, getConfigPath } = require("./core/API");
const doctor = require("./core/doctor");

const app = express();
const PORT = 3667;

app.use(express.json({ limit: "64kb" }));
app.use(express.static(path.join(__dirname, "public")));

/* ============================================================
   BOOTSTRAP: đảm bảo .maid/maid.json tồn tại
   ============================================================ */
const ROOT = __dirname;
const EXAMPLE_CONFIG = path.join(ROOT, "json", "maid.example.json");
const USER_DIR = path.join(ROOT, ".maid");
const USER_CONFIG = path.join(USER_DIR, "maid.json");

function ensureUserConfig() {
    try {
        if (!fs.existsSync(USER_DIR)) {
            fs.mkdirSync(USER_DIR, { recursive: true });
        }

        if (!fs.existsSync(USER_CONFIG)) {
            if (!fs.existsSync(EXAMPLE_CONFIG)) {
                console.warn("[Mina] Không tìm thấy json/maid.example.json");
                return;
            }
            fs.copyFileSync(EXAMPLE_CONFIG, USER_CONFIG);
            console.log("[Mina] Đã tạo .maid/maid.json từ maid.example.json");
        }
    } catch (err) {
        console.error("[Mina] Bootstrap lỗi:", err.message);
    }
}

ensureUserConfig();

/* ============================================================
   CHAT API
   ============================================================ */
app.post("/api/chat", async (req, res) => {
    try {
        const { message } = req.body || {};

        if (typeof message !== "string" || !message.trim()) {
            return res.status(400).json({
                error: "Vui lòng nhập tin nhắn."
            });
        }

        const reply = await generateReply(message);
        res.json({ reply });
    } catch (error) {
        console.error("[Mina API]", error.message);
        res.status(502).json({
            error: "Không thể kết nối AI. Hãy kiểm tra Gemini API key và model."
        });
    }
});

/* ============================================================
   CONFIG API
   ============================================================ */
app.get("/api/config", (req, res) => {
    try {
        const cfg = readConfig();
        res.json({
            config: cfg,
            source: getConfigPath(),
            hasUserConfig: fs.existsSync(USER_CONFIG)
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post("/api/config", (req, res) => {
    try {
        const body = req.body;

        if (!body || typeof body !== "object") {
            return res.status(400).json({ error: "Dữ liệu không hợp lệ." });
        }

        const isEmpty = !body.PERSONAL && !body.ARGS;

        // Nếu rỗng hoàn toàn → xoá file user để fallback về example
        if (isEmpty) {
            if (fs.existsSync(USER_CONFIG)) {
                fs.unlinkSync(USER_CONFIG);
            }
            return res.json({
                ok: true,
                fallback: true,
                config: readConfig(),
                source: getConfigPath()
            });
        }

        if (!fs.existsSync(USER_DIR)) {
            fs.mkdirSync(USER_DIR, { recursive: true });
        }

        fs.writeFileSync(
            USER_CONFIG,
            JSON.stringify(body, null, 2),
            "utf8"
        );

        res.json({
            ok: true,
            config: readConfig(),
            source: getConfigPath()
        });
    } catch (err) {
        console.error("[Mina Config]", err.message);
        res.status(500).json({ error: err.message });
    }
});

/* ============================================================
   PC DOCTOR API
   ============================================================ */
app.get("/api/doctor", async (req, res) => {
    try {
        const type = req.query.check;

        if (!type || typeof type !== "string") {
            return res.status(400).json({
                error: "Thiếu tham số 'check' (system|memory|disk|processes)."
            });
        }

        const data = await doctor.runCheck(type);
        res.json(data);
    } catch (err) {
        console.error("[Mina Doctor]", err.message);
        res.status(400).json({ error: err.message });
    }
});

/* ============================================================
   LISTEN
   ============================================================ */
app.listen(PORT, "127.0.0.1", () => {
    console.log(`🌸 Mina Station: http://localhost:${PORT}`);
    console.log(`   Config: ${getConfigPath()}`);
});