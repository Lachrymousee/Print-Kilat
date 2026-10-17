/* ============================================================
   Print Kilat — dashboard admin
   Total pesanan · masih berjalan · pendapatan · riwayat pesanan (dengan filter)
   ============================================================ */
(() => {
  "use strict";
  const C = window.KILAT_CONFIG;
  const DB = window.KilatDB;
  const V = window.KilatOrderView;
  const session = window.KilatAuth.current();
  if (!session || session.role !== "admin") return; // guard di <head> sudah mengalihkan

  const $ = (s) => document.querySelector(s);
  const LABEL = C.statusLabels;
  const RUNNING = ["paid", "printing", "picked_up", "on_the_way"];
  const money = (n) => "Rp" + Math.round(n).toLocaleString("id-ID");
  const kmFmt = (n) =>
    Number(n).toLocaleString("id-ID", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }) + " km";
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
  const dt = (ts) =>
    ts
      ? new Date(ts).toLocaleString("id-ID", {
          day: "2-digit",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "-";

  const FILTERS = [
    ["all", "Semua", () => true],
    ["running", "Berjalan", (o) => RUNNING.includes(o.status)],
    ["delivered", "Selesai", (o) => o.status === "delivered"],
    ["pending", "Menunggu pembayaran", (o) => o.status === "pending"],
  ];
  let filter = "all";
  const openIds = new Set();

  $("#whoLabel").textContent = session.label;
  $("#hello").textContent = `Halo, ${session.name}.`;
  $("#btnLogout").addEventListener("click", () => window.KilatAuth.logout());

  /* ---------- render ---------- */
  function contactHtml(o) {
    if (!o.phone) return "-";
    return `${esc(V.phoneDisplay(o.phone))} · <a href="${esc(V.waLink(o.phone))}" target="_blank" rel="noopener">WhatsApp</a>`;
  }

  function promoLine(o) {
    if (!o.promo) return "";
    return `<br>Promo ${esc(o.promo.code)} −${money(o.promo.discount || 0)}`;
  }

  function detailHtml(o) {
    const price = o.price || {};
    const hist = C.statusLabels;
    const histItems = Object.keys(hist)
      .filter((k) => o.history && o.history[k])
      .map((k) => `<li>${esc(hist[k])} <b>${dt(o.history[k])}</b></li>`)
      .join("");
    const fileRows = V.files(o)
      .map(
        (f) => `
      <div><dt>${esc(f.name)}</dt><dd>${esc(V.pagesLabel(f))}<br>${esc(V.specParts(f).join(" · "))}</dd></div>`,
      )
      .join("");
    return `
      <div class="o-detail">
        <dl class="o-grid">
          ${fileRows}
          <div><dt>Tujuan</dt><dd>${esc(o.address)}<br>${esc(o.campus?.name)}</dd></div>
          <div><dt>Kontak penerima</dt><dd>${contactHtml(o)}</dd></div>
          <div><dt>Jarak &amp; estimasi</dt><dd>${kmFmt(o.distanceKm ?? 0)} · ${esc(o.etaMin)} menit</dd></div>
          <div><dt>Kurir</dt><dd>${o.courier ? esc(o.courier.name) : "Belum ada"}</dd></div>
          <div><dt>Rincian harga</dt><dd>Cetak ${money(price.print || 0)} · Jilid ${money(price.binding || 0)}<br>Ongkir ${money(price.delivery || 0)} · Platform ${money(price.platform || 0)}${promoLine(o)}<br><b>Total ${money(price.total || 0)}</b></dd></div>
          <div><dt>Dibuat</dt><dd>${dt(o.createdAt)}</dd></div>
        </dl>
        <ul class="o-hist" aria-label="Riwayat status">${histItems}</ul>
      </div>`;
  }

  function rowHtml(o) {
    return `
      <details class="order-row" data-id="${esc(o.id)}"${openIds.has(o.id) ? " open" : ""}>
        <summary>
          <div><p class="o-code">${esc(o.id)}</p><p class="o-file">${esc(V.title(o))}</p></div>
          <span class="o-status s-${esc(o.status)}"><i></i>${esc(LABEL[o.status] || o.status)}</span>
          <strong class="o-price">${money(o.price?.total || 0)}</strong>
        </summary>
        ${detailHtml(o)}
      </details>`;
  }

  async function render() {
    const orders = await DB.listOrders();

    const running = orders.filter((o) => RUNNING.includes(o.status)).length;
    const revenue = orders
      .filter((o) => o.status !== "pending")
      .reduce((a, o) => a + (o.price?.total || 0), 0);
    $("#statTotal").textContent = orders.length.toLocaleString("id-ID");
    $("#statRunning").textContent = running.toLocaleString("id-ID");
    $("#statRevenue").textContent = money(revenue);

    $("#filters").innerHTML = FILTERS.map(
      ([key, label, fn]) =>
        `<button type="button" class="filter" data-f="${key}" aria-pressed="${key === filter}">${label}<small>${orders.filter(fn).length}</small></button>`,
    ).join("");

    const fn = FILTERS.find((f) => f[0] === filter)[2];
    const shown = orders.filter(fn);
    $("#countChip").textContent = `${shown.length} order`;

    $("#orderList").innerHTML = shown.length
      ? shown.map(rowHtml).join("")
      : `<div class="empty-state">
           <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="m3 8 9 5 9-5M12 13v8"/></svg>
           ${orders.length ? "Tidak ada pesanan di filter ini." : "Belum ada pesanan. Pesanan pelanggan akan muncul di sini."}
         </div>`;
  }

  $("#filters").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-f]");
    if (!b) return;
    filter = b.dataset.f;
    render();
  });
  $("#orderList").addEventListener(
    "toggle",
    (e) => {
      const d = e.target;
      if (!d.dataset || !d.dataset.id) return;
      if (d.open) openIds.add(d.dataset.id);
      else openIds.delete(d.dataset.id);
    },
    true,
  );

  /* ---------- alat demo ---------- */
  // defs: [[nama, halamanTotal, halamanDicetak, rentang, salinan, warna, jilid, ukuran, jenisKertas], ...]
  function sample(defs, status, minsAgo, courier, promoCode) {
    const created = Date.now() - minsAgo * 60000;
    const campus = C.campuses[0];
    const km = campus.defaultDistanceKm;
    const history = { pending: created };
    const items = defs.map(
      ([
        name,
        pages,
        printPages,
        range,
        copies,
        color,
        binding,
        paper,
        paperType,
      ]) => ({
        name,
        size: 240000,
        pages,
        range,
        printPages,
        options: {
          color,
          sides: "single",
          paper: paper || "A4",
          paperType: paperType || "hvs70",
          binding,
          copies,
        },
      }),
    );
    const calc = window.KilatPricing.calcOrder(
      items.map((f) => ({ ...f.options, pages: f.printPages })),
      promoCode ? window.KilatPricing.findPromo(promoCode) : null,
    );
    items.forEach((f, i) => {
      f.price = { print: calc.items[i].print, binding: calc.items[i].binding };
    });
    const order = {
      campus: { id: campus.id, name: campus.name },
      address: "Kost Green Park, lantai 2, kamar 203",
      phone: "081234567890",
      distanceKm: km,
      etaMin: Math.round((km / C.courierKmh) * 60) + C.prepMinutes,
      files: items,
      price: {
        print: calc.print,
        binding: calc.binding,
        delivery: calc.delivery,
        platform: calc.platform,
        subtotal: calc.subtotal,
        discount: calc.discount,
        total: calc.total,
      },
      promo: calc.promo,
      createdAt: created,
      status,
      history,
    };
    if (status !== "pending") {
      const flow = window.KilatDB.FLOW;
      const upto = flow.indexOf(status);
      for (let i = 0; i <= upto; i++)
        history[flow[i]] = created + (i + 1) * 90000;
      order.paidAt = history.paid;
      if (courier && upto >= 1) order.courier = courier;
    }
    return order;
  }

  $("#btnSeed").addEventListener("click", async () => {
    const raka = { username: "raka", name: "Raka" };
    await DB.importOrders([
      sample(
        [
          [
            "proposal-skripsi.pdf",
            60,
            42,
            "1-42",
            1,
            "bw",
            "spiral",
            "A4",
            "hvs80",
          ],
        ],
        "on_the_way",
        8,
        raka,
      ),
      sample(
        [
          [
            "slide-presentasi.pdf",
            20,
            20,
            "Semua",
            1,
            "color",
            "none",
            "A4",
            "art120",
          ],
        ],
        "pending",
        25,
      ),
      sample(
        [
          [
            "laporan-magang.pdf",
            36,
            30,
            "1-5, 8-32",
            2,
            "bw",
            "spiral",
            "F4",
            "hvs70",
          ],
          ["lampiran.pdf", 12, 12, "Semua", 2, "bw", "staples", "F4", "hvs70"],
        ],
        "delivered",
        95,
        raka,
      ),
      sample(
        [["tugas-kuliah.pdf", 12, 12, "Semua", 1, "bw", "none", "A4", "hvs70"]],
        "delivered",
        180,
        raka,
        "HEMAT",
      ),
      sample(
        [
          [
            "poster-acara.pdf",
            1,
            1,
            "Semua",
            3,
            "color",
            "none",
            "A3",
            "art150",
          ],
        ],
        "delivered",
        300,
        raka,
      ),
    ]);
    render();
  });

  $("#btnClear").addEventListener("click", async () => {
    if (
      !window.confirm(
        "Hapus semua data pesanan di browser ini? Tindakan ini tidak bisa dibatalkan.",
      )
    )
      return;
    openIds.clear();
    await DB.clearAll();
    render();
  });

  DB.subscribe(render);
  render();
})();
