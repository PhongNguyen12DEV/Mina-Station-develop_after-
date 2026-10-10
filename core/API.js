const fs = require("node:fs");
const path = require("node:path");
const gemini = require("./gemini");   // ← đổi từ "./ollama"

const ROOT = path.resolve(__dirname, "..");
const DEFAULT_CONFIG = path.join(ROOT, "json", "maid.example.json");
const USER_CONFIG = path.join(ROOT, ".maid", "maid.json");

function getConfigPath() {
    return fs.existsSync(USER_CONFIG)
        ? USER_CONFIG
        : DEFAULT_CONFIG;
}

function readConfig() {
    const configPath = getConfigPath();
    return JSON.parse(fs.readFileSync(configPath, "utf8"));
}

async function generateReply(message) {
    const cfg = readConfig();
    return gemini.chat(message, cfg);   // ← đổi từ ollama.chat
}

module.exports = {
    readConfig,
    getConfigPath,
    generateReply
};