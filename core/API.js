const fs = require("node:fs");
const path = require("node:path");
const ollama = require("./ollama");

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
    // mỗi lần gọi đọc lại config để phản ánh thay đổi mới
    const cfg = readConfig();
    return ollama.chat(message, cfg);
}

module.exports = {
    readConfig,
    getConfigPath,
    generateReply
};