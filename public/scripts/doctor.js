// doctor.js
import { doctorGrid, doctorRunAll } from "./dom.js";

/**
 * Gọi backend /api/doctor?check=<type>
 * Backend dùng Node `os`, `child_process` để lấy thông tin máy.
 */
async function runCheck(type) {
    const resultEl = document.getElementById(`doctor-result-${type}`);
    const card = doctorGrid.querySelector(`[data-check="${type}"]`);
    if (!resultEl || !card) return;

    card.classList.add("loading");
    resultEl.innerHTML = `<div class="doctor-loading">Đang chẩn đoán…</div>`;

    try {
        const res = await fetch(`/api/doctor?check=${encodeURIComponent(type)}`);
        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.error || `HTTP ${res.status}`);
        }

        renderResult(resultEl, data);
        card.classList.remove("loading");
        card.classList.add("ok");
    } catch (err) {
        resultEl.innerHTML = `<div class="doctor-error">⚠️ ${escapeHtml(err.message)}</div>`;
        card.classList.remove("loading");
        card.classList.add("error");
    }
}

/* ============================================================
   RENDER RESULT
   ============================================================ */
function renderResult(el, data) {
    el.replaceChildren();

    // Nếu backend trả về danh sách dòng key-value
    if (Array.isArray(data.items)) {
        const dl = document.createElement("dl");
        dl.className = "doctor-kv";
        for (const item of data.items) {
            const dt = document.createElement("dt");
            dt.textContent = item.label;
            const dd = document.createElement("dd");
            dd.textContent = item.value;
            dl.append(dt, dd);
        }
        el.appendChild(dl);
    }

    // Nếu có thêm message / cảnh báo
    if (data.message) {
        const p = document.createElement("p");
        p.className = "doctor-message";
        p.textContent = data.message;
        el.appendChild(p);
    }

    // Nếu có danh sách process
    if (Array.isArray(data.processes)) {
        const table = document.createElement("table");
        table.className = "doctor-table";
        table.innerHTML = `
            <thead><tr>
                <th>PID</th><th>Tên</th><th>CPU %</th><th>RAM %</th>
            </tr></thead>
        `;
        const tbody = document.createElement("tbody");
        for (const p of data.processes) {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${escapeHtml(String(p.pid))}</td>
                <td>${escapeHtml(p.name)}</td>
                <td>${escapeHtml(String(p.cpu))}</td>
                <td>${escapeHtml(String(p.memory))}</td>
            `;
            tbody.appendChild(tr);
        }
        table.appendChild(tbody);
        el.appendChild(table);
    }
}

function escapeHtml(s) {
    return String(s)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

/* ============================================================
   INIT
   ============================================================ */
export function initDoctor() {
    // Nút "Chạy" từng card
    doctorGrid.querySelectorAll(".doctor-run").forEach(btn => {
        btn.addEventListener("click", () => {
            runCheck(btn.dataset.check);
        });
    });

    // Nút "Chạy toàn bộ"
    doctorRunAll.addEventListener("click", () => {
        doctorGrid.querySelectorAll(".doctor-card").forEach(card => {
            runCheck(card.dataset.check);
        });
    });
}