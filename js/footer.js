/* ============================================================
   Print Kilat — footer bersama
   Satu sumber untuk semua halaman pelanggan. Ubah tautan di bagian COLUMNS.
   Kontak dan sosial media diisi lewat js/config.js (supportContact, social).
   ============================================================ */
(() => {
  "use strict";
  const host = document.getElementById("site-footer");
  if (!host) return;

  const C = window.KILAT_CONFIG || {};
  const esc = (s) =>
    String(s == null ? "" : s).replace(
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

  const contact = String(C.supportContact || "").trim();
  const social = C.social || {};
  const igUrl = /^https?:\/\//i.test(social.instagram || "")
    ? social.instagram
    : "";
  const waNum = String(social.whatsapp || "").replace(/\D/g, "");

  /* ---------- KOLOM TAUTAN ---------- */
  const columns = [
    {
      title: "Layanan",
      links: [
        ["Mulai pesanan", "order.html"],
        ["Cara kerja", "index.html#cara-kerja"],
        ["Fitur", "index.html#fitur"],
        ["Harga", "index.html#harga"],
        ["Lacak pesanan", "tracking.html"],
      ],
    },
    {
      title: "Keamanan & privasi",
      links: [
        ["Jaminan keamanan", "keamanan.html"],
        ["Diimplementasikan", "keamanan.html#aktif"],
        ["Rencana versi rilis", "keamanan.html#rencana"],
        ["Kode serah terima", "keamanan.html#kode"],
        ["Batasan prototype", "keamanan.html#batasan"],
      ],
    },
    {
      title: "Bantuan & staf",
      links: [
        ...(contact
          ? [["Hubungi kami", contact.includes("@") ? "mailto:" + contact : ""]]
          : []),
        ["Masuk staf", "login.html"],
        ["Dashboard admin", "admin.html"],
        ["Dashboard kurir", "courier.html"],
      ],
    },
  ];

  const colHtml = columns
    .map(
      (col, i) => `
        <nav class="kf-col" aria-labelledby="kf-h${i}">
          <h3 id="kf-h${i}">${esc(col.title)}</h3>
          <ul>
            ${col.links
              .map(([label, href]) =>
                href
                  ? `<li><a href="${esc(href)}">${esc(label)}</a></li>`
                  : `<li><span>${esc(label)}: ${esc(contact)}</span></li>`,
              )
              .join("\n            ")}
          </ul>
        </nav>`,
    )
    .join("");

  /* ---------- IKON SOSIAL (hanya yang diisi) ---------- */
  const icon = (d) =>
    `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const socials = [];
  if (igUrl)
    socials.push([
      "Instagram Print Kilat",
      igUrl,
      icon(
        '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".6" fill="currentColor"/>',
      ),
    ]);
  if (waNum)
    socials.push([
      "WhatsApp Print Kilat",
      "https://wa.me/" + waNum,
      icon('<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>'),
    ]);
  if (contact.includes("@"))
    socials.push([
      "Email Print Kilat",
      "mailto:" + contact,
      icon(
        '<rect x="2" y="4" width="20" height="16" rx="3"/><path d="m22 7-10 6L2 7"/>',
      ),
    ]);

  const followHtml = socials.length
    ? `
        <div class="kf-follow">
          <span>Ikuti Print Kilat</span>
          <ul>${socials
            .map(
              ([label, href, svg]) =>
                `<li><a href="${esc(href)}" aria-label="${esc(label)}" rel="noopener"${href.startsWith("http") ? ' target="_blank"' : ""}>${svg}</a></li>`,
            )
            .join("")}</ul>
        </div>`
    : "";

  const year = new Date().getFullYear();

  host.innerHTML = `
    <div class="kf-top">
      <div class="container">
        <h2 class="sr-only">Tautan Print Kilat</h2>
        <div class="kf-cols">${colHtml}
        </div>

        <div class="kf-cta">
          <span class="kf-cta-icon" aria-hidden="true">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8" rx="1"/></svg>
          </span>
          <p>Siap print tanpa antre?</p>
          <a class="btn btn-primary" href="order.html">Mulai pesanan</a>${followHtml}
        </div>
      </div>
    </div>

    <div class="kf-bottom">
      <div class="container">
        <a class="logo" href="index.html" aria-label="Print Kilat, ke beranda">
          <img class="logo-img" src="assets/logo.svg" alt="" width="32" height="32">
          <span class="logo-text">Print Kilat</span>
        </a>
        <ul class="kf-legal">
          <li><a href="keamanan.html">Keamanan &amp; privasi</a></li>
          <li><a href="keamanan.html#batasan">Batasan prototype</a></li>
          <li><a href="login.html">Masuk staf</a></li>
        </ul>
        <p class="kf-copy">© ${year} Print Kilat · Prototype</p>
      </div>
    </div>`;
})();
