// core/doctor.js
const os = require("node:os");
const { exec } = require("node:child_process");
const { promisify } = require("node:util");

const execAsync = promisify(exec);

/* ============================================================
   HELPERS
   ============================================================ */
function bytesToGB(bytes) {
    return (bytes / 1024 / 1024 / 1024).toFixed(1) + " GB";
}

function secondsToUptime(sec) {
    const d = Math.floor(sec / 86400);
    const h = Math.floor((sec % 86400) / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const parts = [];
    if (d) parts.push(`${d}d`);
    if (h) parts.push(`${h}h`);
    parts.push(`${m}m`);
    return parts.join(" ");
}

/* ============================================================
   CHECKS
   ============================================================ */

// 1. Thông tin hệ thống
function getSystemInfo() {
    const cpus = os.cpus();
    return {
        items: [
            { label: "Hệ điều hành", value: `${os.type()} ${os.release()}` },
            { label: "Nền tảng", value: `${os.platform()} (${os.arch()})` },
            { label: "CPU", value: cpus[0]?.model?.trim() || "Unknown" },
            { label: "Số nhân", value: String(cpus.length) },
            { label: "Tổng RAM", value: bytesToGB(os.totalmem()) },
            { label: "Hostname", value: os.hostname() },
            { label: "Uptime", value: secondsToUptime(os.uptime()) }
        ],
        message: "✓ Đã lấy thông tin hệ thống."
    };
}

// 2. Bộ nhớ RAM
function getMemoryInfo() {
    const total = os.totalmem();
    const free = os.freemem();
    const used = total - free;
    const pct = ((used / total) * 100).toFixed(1);

    let message = "✓ RAM đang ở mức ổn định.";
    if (pct > 90) message = "⚠️ RAM dùng trên 90%, rất nặng. Nên đóng app không cần thiết.";
    else if (pct > 75) message = "⚠️ RAM dùng trên 75%, anh nên để ý.";

    return {
        items: [
            { label: "Tổng", value: bytesToGB(total) },
            { label: "Đã dùng", value: `${bytesToGB(used)} (${pct}%)` },
            { label: "Còn trống", value: bytesToGB(free) }
        ],
        message
    };
}

// 3. Ổ đĩa
async function getDiskInfo() {
    try {
        const { stdout } = await execAsync("df -h /");
        const lines = stdout.trim().split("\n");
        if (lines.length < 2) {
            throw new Error("Không đọc được output của df.");
        }

        // macOS: "Filesystem  Size  Used  Avail  Capacity  iused  ifree %iused  Mounted"
        // Linux:  "Filesystem  Size  Used  Avail  Use%   Mounted"
        const cols = lines[1].trim().split(/\s+/);
        const used = cols[2];
        const avail = cols[3];
        const capacity = cols[4];
        const pct = parseInt(capacity);

        let message = "✓ Ổ đĩa còn đủ chỗ.";
        if (pct > 90) message = "⚠️ Ổ đĩa gần đầy (>90%). Anh nên dọn dẹp ngay.";
        else if (pct > 75) message = "⚠️ Ổ đĩa đã dùng trên 75%, nên dọn dẹp dần.";

        return {
            items: [
                { label: "Filesystem", value: cols[0] },
                { label: "Dung lượng", value: cols[1] },
                { label: "Đã dùng", value: used },
                { label: "Còn trống", value: avail },
                { label: "Sử dụng", value: capacity }
            ],
            message
        };
    } catch (err) {
        throw new Error("Không đọc được thông tin ổ đĩa: " + err.message);
    }
}

// 4. Tiến trình nặng nhất
async function getTopProcesses() {
    try {
        // macOS / Linux: ps -Ao pid,comm,%cpu,%mem -r | head
        const { stdout } = await execAsync(
            "ps -Ao pid,comm,%cpu,%mem -r | head -n 11"
        );

        const lines = stdout.trim().split("\n").slice(1); // bỏ header

        const processes = lines
            .map(line => {
                const parts = line.trim().split(/\s+/);
                if (parts.length < 4) return null;

                const pid = parts[0];
                const mem = parts[parts.length - 1];
                const cpu = parts[parts.length - 2];
                // comm có thể chứa space ở giữa → gộp lại
                const name = parts.slice(1, -2).join(" ").split("/").pop();

                return { pid, name, cpu, memory: mem };
            })
            .filter(Boolean);

        return {
            processes,
            message: "Top 10 tiến trình theo CPU (giảm dần)."
        };
    } catch (err) {
        throw new Error("Không đọc được danh sách tiến trình: " + err.message);
    }
}

/* ============================================================
   RUNNER
   ============================================================ */
async function runCheck(type) {
    switch (type) {
        case "system":
            return getSystemInfo();
        case "memory":
            return getMemoryInfo();
        case "disk":
            return getDiskInfo();
        case "processes":
            return getTopProcesses();
        default:
            throw new Error("Loại kiểm tra không hợp lệ: " + type);
    }
}

module.exports = { runCheck };