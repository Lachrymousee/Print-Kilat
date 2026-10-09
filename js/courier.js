/* ============================================================
   Print Kilat — dashboard kurir
   Menampilkan tugas yang belum selesai: pesanan yang sudah dibayar
   dan belum diambil kurir lain. Tombol memajukan status pesanan,
   dan halaman pelacakan pelanggan ikut berubah.
   ============================================================ */
(() => {
  "use strict";
  const C = window.KILAT_CONFIG;
  const DB = window.KilatDB;
  const V = window.KilatOrderView;
  const me = window.KilatAuth.current();
  if (!me || me.role !== "courier") return; // guard di <head> sudah mengalihkan

  const $ = (s) => document.querySelector(s);
  const ACTIVE = ["paid", "printing", "picked_up", "on_the_way"];
  const ACTION = {
    paid: "Mulai cetak dokumen",
    printing: "Ambil hasil cetak",
    picked_up: "Mulai antar",
    on_the_way: "Tandai sudah sampai",
  };
  const STEPS = ["Cetak", "Ambil", "Antar", "Sampai"];
  const DONE_COUNT = { paid: 0, printing: 1, picked_up: 2, on_the_way: 3 };
  const esc = (s) =>
    String(s ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  const kmFmt = (n) =>
    Number(n).toLocaleString("id-ID", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }) + " km";
  const timeFmt = (ts) =>
    new Date(ts).toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });

  $("#whoLabel").textContent = me.label;
  $("#hello").textContent = `Halo, ${me.name}.`;
  $("#btnLogout").addEventListener("click", () => window.KilatAuth.logout());

  function taskHtml(o) {
    const done = DONE_COUNT[o.status];
    const files = V.files(o);
    const fileRows = files
      .map(
        (f) => `
          <li><strong>${esc(f.name)}</strong>
            <span>${esc(V.pagesLabel(f))} · ${esc(V.specParts(f).join(" · "))}</span></li>`,
      )
      .join("");
    const codeRow =
      o.status === "on_the_way"
        ? `<div class="code-row">
           <label for="code-${esc(o.id)}">Kode serah terima dari penerima</label>
           <input class="input" id="code-${esc(o.id)}" data-code-for="${esc(o.id)}" type="text" inputmode="numeric"
                  pattern="[0-9]*" maxlength="4" autocomplete="off" placeholder="4 digit">
         </div>`
        : "";
    return `
      <article class="task" data-id="${esc(o.id)}">
        <div class="task-top">
          <div><p class="o-code">${esc(o.id)}</p><p class="o-file">${esc(V.title(o))}</p></div>
          <span class="task-chip"><i></i>${esc(C.statusLabels[o.status])}</span>
        </div>
        <ul class="task-files">${fileRows}</ul>
        <div class="task-dest">
          <span class="icon-badge"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg></span>
          <div><strong>${esc(o.campus?.name)} · ${kmFmt(o.distanceKm ?? 0)}</strong><span>${esc(o.address)}</span></div>
        </div>
        <div class="task-steps" aria-label="Progres">
          ${STEPS.map((s, i) => `<div class="${i < done ? "is-done" : ""}">${s}</div>`).join("")}
        </div>
        ${codeRow}
        <button type="button" class="btn btn-primary" data-advance="${esc(o.id)}">${ACTION[o.status]}</button>
      </article>`;
  }

  async function render() {
    const orders = await DB.listOrders();
    const tasks = orders
      .filter(
        (o) =>
          ACTIVE.includes(o.status) &&
          (!o.courier || o.courier.username === me.username),
      )
      .sort((a, b) => (a.paidAt || 0) - (b.paidAt || 0)); // yang paling lama dibayar dikerjakan dulu

    $("#taskList").innerHTML = tasks.length
      ? tasks.map(taskHtml).join("")
      : `<div class="empty-state">
           <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="m3 8 9 5 9-5M12 13v8"/></svg>
           Belum ada tugas aktif.
         </div>`;

    const finished = orders
      .filter(
        (o) =>
          o.status === "delivered" &&
          o.courier &&
          o.courier.username === me.username,
      )
      .slice(0, 8);
    $("#doneBox").hidden = finished.length === 0;
    $("#doneList").innerHTML = finished
      .map(
        (o) =>
          `<div class="done-item"><span><b>${esc(o.id)}</b>${esc(V.title(o))}</span><span>${timeFmt(o.history?.delivered || o.createdAt)}</span></div>`,
      )
      .join("");
  }

  $("#taskList").addEventListener("click", async (e) => {
    const btn = e.target.closest("button[data-advance]");
    if (!btn) return;
    btn.disabled = true;
    const msg = $("#taskMsg");
    msg.hidden = true;
    const codeInput = document.querySelector(
      `[data-code-for="${btn.dataset.advance}"]`,
    );
    const res = await DB.advance(
      btn.dataset.advance,
      { username: me.username, name: me.name },
      { code: codeInput ? codeInput.value : "" },
    );
    if (!res.ok) {
      msg.textContent = res.error;
      msg.hidden = false;
    }
    render();
  });

  DB.subscribe(render);
  render();
})();
