/* ============================================================
   Print Kilat — logika halaman pemesanan
   Alur: tujuan → upload beberapa file + preview + rentang halaman
         → detail cetak per file → ringkasan → popup QRIS dummy
         → simpan pesanan → tracking.html
   ============================================================ */
(() => {
  "use strict";
  const C = window.KILAT_CONFIG;
  const P = C.pricing;
  const PR = window.KilatPricing;
  const RG = window.KilatRange;
  const V = window.KilatOrderView;

  const $ = (sel) => document.querySelector(sel);
  const rp = (n) => "Rp " + Math.round(n).toLocaleString("id-ID");
  const rpTight = (n) => rp(n).replace("Rp ", "Rp");
  const kmFmt = (n) =>
    n.toLocaleString("id-ID", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }) + " km";
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
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
  const shortName = (name, n = 22) =>
    name.length > n ? name.slice(0, n - 1) + "…" : name;
  const sizeText = (bytes) =>
    bytes >= 1048576
      ? (bytes / 1048576).toFixed(1).replace(".", ",") + " MB"
      : Math.max(1, Math.round(bytes / 1024)) + " KB";

  const DEFAULTS = {
    color: "bw",
    sides: "single",
    paper: "A4",
    paperType: "hvs70",
    binding: "none",
    copies: 1,
  };

  /* ---------- state ---------- */
  const state = {
    campusId: C.campuses[0].id,
    address: "",
    phone: "", // teks mentah dari kolom; diperiksa lewat V.parsePhone()
    promoCode: null, // kode promo yang sedang dipakai (sudah lolos pemeriksaan)
    promoUses: {}, // jumlah pemakaian kode di perangkat ini (untuk promo sekali pakai)
    distanceKm: C.campuses[0].defaultDistanceKm,
    userCoords: null, // diisi jika pelanggan membagikan lokasi
    files: [], // lihat addFile() untuk bentuk item
    activeId: null, // file yang pengaturannya sedang ditampilkan di bagian 03
    defaults: { ...DEFAULTS }, // pengaturan terakhir dipakai; diwarisi file berikutnya
  };
  let seq = 0;

  /* ---------- elemen ---------- */
  const el = {
    campus: $("#campus"),
    campusHint: $("#campusHint"),
    address: $("#address"),
    addressError: $("#addressError"),
    phone: $("#phone"),
    phoneError: $("#phoneError"),
    promoInput: $("#promoInput"),
    btnPromo: $("#btnPromo"),
    promoMsg: $("#promoMsg"),
    btnGeo: $("#btnGeo"),
    geoStatus: $("#geoStatus"),
    dropzone: $("#dropzone"),
    file: $("#file"),
    dzSub: $("#dzSub"),
    fileError: $("#fileError"),
    fileList: $("#fileList"),
    tabsWrap: $("#tabsWrap"),
    fileTabs: $("#fileTabs"),
    applyRow: $("#applyRow"),
    btnApplyAll: $("#btnApplyAll"),
    paperSize: $("#paperSize"),
    paperType: $("#paperType"),
    binding: $("#binding"),
    paperHint: $("#paperHint"),
    copies: $("#copies"),
    copiesMinus: $("#copiesMinus"),
    copiesPlus: $("#copiesPlus"),
    etaBox: $("#etaBox"),
    etaMain: $("#etaMain"),
    etaTo: $("#etaTo"),
    lines: $("#lines"),
    total: $("#total"),
    formError: $("#formError"),
    btnPay: $("#btnPay"),
    modal: $("#payModal"),
    qr: $("#qr"),
    payAmount: $("#payAmount"),
    payTimer: $("#payTimer"),
    btnPaid: $("#btnPaid"),
    payView: $("#payView"),
    paySuccess: $("#paySuccess"),
  };
  const colorRadios = [...document.querySelectorAll('input[name="color"]')];
  const sidesRadios = [...document.querySelectorAll('input[name="sides"]')];

  const campus = () => C.campuses.find((c) => c.id === state.campusId);
  const cardOf = (id) => el.fileList.querySelector(`[data-id="${id}"]`);
  const q = (card, role) => card.querySelector(`[data-role="${role}"]`);
  const itemOf = (id) => state.files.find((f) => f.id === id);

  /* ---------- perhitungan ---------- */
  const countOf = (f) =>
    f.loading || !f.range || !f.range.ok ? 0 : f.range.count;
  const etaMinutes = () =>
    Math.round((state.distanceKm / C.courierKmh) * 60) + C.prepMinutes;
  const inRadius = () => state.distanceKm <= C.radiusKm;

  function orderItems() {
    return state.files.length
      ? state.files.map((f) => ({ ...f.settings, pages: countOf(f) }))
      : [{ ...state.defaults, pages: 0 }];
  }

  // Harga tanpa promo; dipakai untuk memeriksa apakah sebuah kode berlaku.
  const baseCalc = () => PR.calcOrder(orderItems());

  function priceOrder() {
    const items = orderItems();
    const base = PR.calcOrder(items);
    if (!state.promoCode) return base;
    // Periksa ulang setiap kali harga berubah (mis. minimal belanja tidak lagi terpenuhi).
    const chk = PR.checkPromo(state.promoCode, base, { uses: state.promoUses });
    if (!chk.ok) {
      setPromoMsg(`Kode ${state.promoCode} dilepas. ${chk.error}`, "warn");
      state.promoCode = null;
      syncPromoUi();
      return base;
    }
    return PR.calcOrder(items, chk.promo);
  }

  /* ---------- ringkasan ---------- */
  function renderSummary() {
    const calc = priceOrder();
    const rows = [];

    if (!state.files.length) {
      const s = PR.normalize(state.defaults);
      rows.push([
        `0 hal × ${s.copies} · ${V.colorLabel(s.color)}`,
        calc.items[0].print,
      ]);
      if (s.binding !== "none")
        rows.push([V.bindLabel(s.binding), calc.items[0].binding]);
    } else {
      const multi = state.files.length > 1;
      state.files.forEach((f, i) => {
        const s = PR.normalize(f.settings);
        const tag = multi ? shortName(f.name, 16) + " · " : "";
        rows.push([
          `${tag}${countOf(f)} hal × ${s.copies} · ${V.colorLabel(s.color)}`,
          calc.items[i].print,
        ]);
        if (s.binding !== "none")
          rows.push([
            `${V.bindLabel(s.binding)}${multi ? " · " + shortName(f.name, 16) : ""}`,
            calc.items[i].binding,
          ]);
      });
    }
    rows.push(
      [`Ongkir radius ${C.radiusKm} km`, calc.delivery],
      ["Biaya platform", calc.platform],
    );
    if (calc.promo && calc.discount > 0) {
      rows.push([`Promo ${calc.promo.code}`, -calc.discount, "is-promo"]);
    }
    if (calc.promo) {
      setPromoMsg(
        `Kode ${calc.promo.code} dipakai: ${calc.promo.label} (hemat ${rp(calc.discount)}).`,
        "ok",
      );
    }

    el.lines.innerHTML = rows
      .map(
        ([k, v, cls]) =>
          `<div${cls ? ` class="${cls}"` : ""}><dt>${esc(k)}</dt><dd>${v < 0 ? "−" + rp(-v) : rp(v)}</dd></div>`,
      )
      .join("");
    el.total.textContent = rp(calc.total);

    const out = !inRadius();
    el.etaBox.classList.toggle("is-out", out);
    el.etaMain.textContent = out
      ? `${kmFmt(state.distanceKm)} · di luar radius ${C.radiusKm} km`
      : `${kmFmt(state.distanceKm)} · ${etaMinutes()} menit`;
    el.etaTo.textContent = out
      ? "Pilih titik kampus lain atau alamat yang lebih dekat."
      : `Ke ${campus().name}`;
  }

  function renderCampusHint() {
    el.campusHint.textContent = `Layanan aktif dalam radius ${C.radiusKm} km · ${campus().address}`;
  }

  /* ---------- init pilihan ---------- */
  el.campus.innerHTML = C.campuses
    .map((c) => `<option value="${c.id}">${esc(c.name)}</option>`)
    .join("");
  el.binding.innerHTML = Object.entries(P.binding)
    .map(
      ([k, b]) =>
        `<option value="${k}">${esc(b.label)}${b.price ? " · " + rpTight(b.price) : ""}</option>`,
    )
    .join("");
  el.paperSize.innerHTML = Object.entries(P.sizes)
    .map(([k, s]) => `<option value="${k}">${esc(s.label)}</option>`)
    .join("");
  el.paperType.innerHTML = Object.entries(P.paperTypes)
    .map(
      ([k, t]) =>
        `<option value="${k}">${esc(t.label)}${t.add ? ` · +${rpTight(t.add)}/hlm` : ""}</option>`,
    )
    .join("");
  el.dzSub.textContent = `Maksimal ${C.maxFiles} file · ${C.maxFileMB} MB per file · preview muncul otomatis`;

  /* ---------- tujuan & lokasi ---------- */
  function haversineKm(a, b) {
    const R = 6371,
      rad = (d) => (d * Math.PI) / 180;
    const dLat = rad(b.lat - a.lat),
      dLng = rad(b.lng - a.lng);
    const h =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }

  function updateDistance() {
    state.distanceKm = state.userCoords
      ? haversineKm(state.userCoords, campus()) * C.roadFactor
      : campus().defaultDistanceKm;
  }

  el.campus.addEventListener("change", () => {
    state.campusId = el.campus.value;
    updateDistance();
    renderCampusHint();
    renderSummary();
  });

  el.address.addEventListener("input", () => {
    state.address = el.address.value.trim();
    el.address.removeAttribute("aria-invalid");
    el.addressError.hidden = true;
  });

  /* ---------- nomor telepon ---------- */
  el.phone.addEventListener("input", () => {
    state.phone = el.phone.value;
    el.phone.removeAttribute("aria-invalid");
    el.phoneError.hidden = true;
  });
  // Rapikan tulisan saat kolom ditinggalkan: "+62 812 3456 7890" jadi "0812-3456-7890"
  el.phone.addEventListener("blur", () => {
    const r = V.parsePhone(el.phone.value);
    if (r.ok) el.phone.value = V.phoneDisplay(r.value);
  });

  /* ---------- kode promo ---------- */
  function setPromoMsg(text, kind) {
    el.promoMsg.textContent = text || "";
    el.promoMsg.dataset.kind = kind || "";
  }

  function syncPromoUi() {
    const on = !!state.promoCode;
    el.promoInput.disabled = on;
    el.btnPromo.textContent = on ? "Lepas" : "Pakai";
    if (on) el.promoInput.value = state.promoCode;
  }

  el.btnPromo.addEventListener("click", () => {
    if (state.promoCode) {
      state.promoCode = null;
      el.promoInput.value = "";
      setPromoMsg("");
      syncPromoUi();
      renderSummary();
      el.promoInput.focus();
      return;
    }
    const chk = PR.checkPromo(el.promoInput.value, baseCalc(), {
      uses: state.promoUses,
    });
    if (!chk.ok) {
      el.promoInput.setAttribute("aria-invalid", "true");
      setPromoMsg(chk.error, "error");
      return;
    }
    el.promoInput.removeAttribute("aria-invalid");
    state.promoCode = chk.promo.code;
    syncPromoUi();
    renderSummary(); // renderSummary menampilkan pesan berhasil
  });
  el.promoInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      el.btnPromo.click();
    }
  });
  el.promoInput.addEventListener("input", () => {
    el.promoInput.removeAttribute("aria-invalid");
    if (!state.promoCode) setPromoMsg("");
  });

  el.btnGeo.addEventListener("click", () => {
    if (!navigator.geolocation) {
      el.geoStatus.textContent =
        "Browser ini tidak mendukung lokasi. Jarak memakai perkiraan titik antar.";
      return;
    }
    el.btnGeo.disabled = true;
    el.geoStatus.textContent = "Membaca lokasimu…";
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        state.userCoords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        updateDistance();
        el.btnGeo.disabled = false;
        el.geoStatus.textContent = inRadius()
          ? "Lokasi terbaca. Jarak dihitung dari posisimu."
          : `Lokasimu sekitar ${kmFmt(state.distanceKm)} dari kampus, di luar radius layanan.`;
        renderSummary();
      },
      () => {
        el.btnGeo.disabled = false;
        el.geoStatus.textContent =
          "Izin lokasi belum diberikan. Jarak tetap memakai perkiraan titik antar.";
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  });

  /* ============================================================
     DOKUMEN: banyak file, preview, rentang halaman
     ============================================================ */
  function showFileError(msg) {
    el.fileError.textContent = msg;
    el.fileError.hidden = !msg;
    el.dropzone.classList.toggle("is-invalid", !!msg);
  }

  function cardHtml(item) {
    const id = item.id;
    return `
      <article class="file-card" data-id="${id}" data-state="loading">
        <div class="preview-top">
          <span class="file-badge">${esc(item.ext.toUpperCase())}</span>
          <div class="file-meta">
            <p class="file-name">${esc(item.name)}</p>
            <p class="file-sub" data-role="sub">Membaca dokumen…</p>
          </div>
          <button type="button" class="btn btn-ghost btn-sm" data-act="toggle" aria-expanded="false" disabled>Lihat preview</button>
          <button type="button" class="icon-btn" data-act="remove" aria-label="Hapus ${esc(item.name)}">×</button>
        </div>
        <div class="loading-row" data-role="loading"><span class="spinner"></span>Menyiapkan preview…</div>
        <div class="file-body" data-role="body" hidden>
          <div class="range-row">
            <label for="range-${id}">Halaman yang dicetak</label>
            <div class="range-ctl">
              <input class="input" id="range-${id}" data-role="range" type="text" autocomplete="off" spellcheck="false"
                     placeholder="Kosongkan untuk semua, atau tulis 1-5, 8, 11-13" aria-describedby="rh-${id}">
              <button type="button" class="chip-btn" data-act="all">Semua</button>
            </div>
            <p class="hint" id="rh-${id}" data-role="rangeHint"></p>
            <p class="field-error" data-role="rangeError" hidden></p>
          </div>
          <label class="pages-edit" data-role="pagesEdit" hidden>Perkiraan jumlah halaman
            <input type="number" data-role="pagesInput" min="1" max="999" inputmode="numeric">
          </label>
          <p class="preview-note" data-role="docxNote" hidden>Jumlah halaman DOCX adalah perkiraan. Ubah angkanya jika berbeda dengan dokumenmu.</p>
          <div class="card-preview" data-role="preview" hidden>
            <div data-role="slot"></div>
            <div class="preview-bottom">
              <div class="pager" data-role="pager">
                <button type="button" data-act="prev" aria-label="Halaman sebelumnya">‹</button>
                <span data-role="pageInfo" aria-live="polite"></span>
                <button type="button" data-act="next" aria-label="Halaman berikutnya">›</button>
              </div>
            </div>
          </div>
        </div>
      </article>`;
  }

  const subText = (f) =>
    `${sizeText(f.size)} · ${f.pages} halaman${f.estimated ? " (perkiraan)" : ""}`;

  function paintRange(item) {
    const c = cardOf(item.id);
    if (!c) return;
    const input = q(c, "range"),
      hint = q(c, "rangeHint"),
      err = q(c, "rangeError");
    const r = item.range;
    if (r.ok) {
      err.hidden = true;
      input.removeAttribute("aria-invalid");
      hint.textContent = r.all
        ? `Mencetak semua ${item.pages} halaman.`
        : `Mencetak ${r.count} dari ${item.pages} halaman (hal. ${r.label}).`;
    } else {
      err.textContent = r.error;
      err.hidden = false;
      input.setAttribute("aria-invalid", "true");
      hint.textContent = "";
    }
  }

  function updatePager(item) {
    const c = cardOf(item.id);
    if (!c) return;
    q(c, "pageInfo").textContent =
      `Halaman ${item.ctl.page} dari ${item.pages}`;
    c.querySelector('[data-act="prev"]').disabled = item.ctl.page <= 1;
    c.querySelector('[data-act="next"]').disabled = item.ctl.page >= item.pages;
  }

  function updateCard(item) {
    const c = cardOf(item.id);
    if (!c) return;
    c.dataset.state = item.loading ? "loading" : "ready";
    q(c, "loading").hidden = !item.loading;
    q(c, "body").hidden = !!item.loading;
    c.querySelector('[data-act="toggle"]').disabled = !!item.loading;
    if (item.loading) return;
    q(c, "sub").textContent = subText(item);
    q(c, "pagesEdit").hidden = !item.estimated;
    q(c, "docxNote").hidden = !item.estimated;
    q(c, "pager").hidden = item.kind !== "pdf";
    q(c, "pagesInput").value = item.pages;
    paintRange(item);
  }

  function addFile(file, ext) {
    const item = {
      id: "f" + ++seq,
      name: file.name,
      size: file.size,
      ext,
      kind: ext === "pdf" ? "pdf" : "docx",
      pages: 0,
      estimated: false,
      loading: true,
      expanded: false,
      rangeText: "",
      range: { ok: true, all: true, count: 0, label: "Semua" },
      ctl: window.KilatPreview.create(),
      settings: { ...state.defaults },
    };
    state.files.push(item);
    el.fileList.insertAdjacentHTML("beforeend", cardHtml(item));
    state.activeId = item.id;
    renderTabs();
    syncForm();
    renderSummary();

    return item.ctl
      .open(file)
      .then((info) => {
        if (!state.files.includes(item)) {
          item.ctl.close();
          return null;
        } // dihapus saat masih dibaca
        item.pages = info.pages;
        item.estimated = info.estimated;
        item.kind = info.kind;
        item.loading = false;
        item.range = RG.parse("", item.pages);
        updateCard(item);
        renderSummary();
        return null;
      })
      .catch((err) => {
        removeItem(item.id);
        return `${file.name}: ${(err && err.message) || "File tidak bisa dibuka. Coba file lain."}`;
      });
  }

  async function handleFiles(list) {
    showFileError("");
    const incoming = [...list];
    if (!incoming.length) return;
    const errors = [];
    const jobs = [];
    for (const file of incoming) {
      if (state.files.length >= C.maxFiles) {
        errors.push(`Maksimal ${C.maxFiles} file per pesanan.`);
        break;
      }
      const ext = (file.name.split(".").pop() || "").toLowerCase();
      if (!["pdf", "docx"].includes(ext)) {
        errors.push(
          `${file.name}: format belum didukung, pilih PDF atau DOCX.`,
        );
        continue;
      }
      if (file.size > C.maxFileMB * 1024 * 1024) {
        errors.push(`${file.name}: ukuran melebihi ${C.maxFileMB} MB.`);
        continue;
      }
      jobs.push(addFile(file, ext));
    }
    const results = await Promise.all(jobs);
    results.filter(Boolean).forEach((m) => errors.push(m));
    showFileError(errors.join(" "));
  }

  function removeItem(id) {
    const i = state.files.findIndex((f) => f.id === id);
    if (i < 0) return;
    const [item] = state.files.splice(i, 1);
    item.ctl.close();
    const c = cardOf(id);
    if (c) c.remove();
    if (state.activeId === id) {
      state.activeId = state.files.length
        ? state.files[Math.min(i, state.files.length - 1)].id
        : null;
    }
    renderTabs();
    syncForm();
    renderSummary();
  }

  async function togglePreview(item, c, btn) {
    item.expanded = !item.expanded;
    btn.setAttribute("aria-expanded", String(item.expanded));
    btn.textContent = item.expanded ? "Tutup preview" : "Lihat preview";
    q(c, "preview").hidden = !item.expanded;
    if (item.expanded) {
      const slot = q(c, "slot");
      if (!slot.contains(item.ctl.stage)) slot.appendChild(item.ctl.stage);
      try {
        await item.ctl.refit();
      } catch (e) {
        /* preview tetap tampil walau gagal dirender ulang */
      }
      updatePager(item);
    }
  }

  async function turnPage(item, delta) {
    await item.ctl.goTo(item.ctl.page + delta);
    updatePager(item);
  }

  function setRange(item, text) {
    item.rangeText = text;
    item.range = RG.parse(text, item.pages);
    paintRange(item);
    renderSummary();
  }

  el.fileList.addEventListener("click", async (e) => {
    const c = e.target.closest(".file-card");
    if (!c) return;
    const item = itemOf(c.dataset.id);
    if (!item) return;
    const btn = e.target.closest("[data-act]");
    if (btn) {
      switch (btn.dataset.act) {
        case "remove":
          removeItem(item.id);
          return;
        case "toggle":
          await togglePreview(item, c, btn);
          break;
        case "prev":
          await turnPage(item, -1);
          break;
        case "next":
          await turnPage(item, 1);
          break;
        case "all":
          q(c, "range").value = "";
          setRange(item, "");
          break;
        default:
          break;
      }
    }
    setActive(item.id);
  });

  el.fileList.addEventListener("focusin", (e) => {
    const c = e.target.closest(".file-card");
    if (c) setActive(c.dataset.id);
  });

  el.fileList.addEventListener("input", (e) => {
    const t = e.target;
    const c = t.closest(".file-card");
    const item = c && itemOf(c.dataset.id);
    if (!item) return;
    if (t.dataset.role === "range") {
      setRange(item, t.value);
    } else if (t.dataset.role === "pagesInput") {
      const v = parseInt(t.value, 10);
      if (v >= 1 && v <= 999) {
        item.pages = v;
        q(c, "sub").textContent = subText(item);
        setRange(item, item.rangeText);
      }
    }
  });

  // Saat kolom rentang ditinggalkan, rapikan tulisannya ("1-3,5" jadi "1-3, 5")
  el.fileList.addEventListener("focusout", (e) => {
    const t = e.target;
    if (!t.dataset || t.dataset.role !== "range") return;
    const c = t.closest(".file-card");
    const item = c && itemOf(c.dataset.id);
    if (item && item.range.ok && !item.range.all) {
      t.value = item.range.label;
      item.rangeText = item.range.label;
    }
  });

  el.file.addEventListener("change", () => {
    handleFiles(el.file.files);
    try {
      el.file.value = "";
    } catch (e) {
      /* abaikan */
    }
  });
  ["dragenter", "dragover"].forEach((ev) =>
    el.dropzone.addEventListener(ev, (e) => {
      e.preventDefault();
      el.dropzone.classList.add("is-drag");
    }),
  );
  ["dragleave", "drop"].forEach((ev) =>
    el.dropzone.addEventListener(ev, (e) => {
      e.preventDefault();
      el.dropzone.classList.remove("is-drag");
    }),
  );
  el.dropzone.addEventListener("drop", (e) =>
    handleFiles(e.dataTransfer.files),
  );

  /* ============================================================
     DETAIL CETAK: pengaturan per file
     ============================================================ */
  const activeSettings = () => {
    const f = itemOf(state.activeId);
    return f ? f.settings : state.defaults;
  };

  function renderTabs() {
    const multi = state.files.length > 1;
    el.tabsWrap.hidden = !multi;
    el.applyRow.hidden = !multi;
    el.fileTabs.innerHTML = state.files
      .map(
        (f) =>
          `<button type="button" class="tab" data-tab="${f.id}" aria-pressed="${f.id === state.activeId}" title="${esc(f.name)}">${esc(shortName(f.name, 24))}</button>`,
      )
      .join("");
    el.fileList
      .querySelectorAll(".file-card")
      .forEach((c) =>
        c.classList.toggle(
          "is-active",
          multi && c.dataset.id === state.activeId,
        ),
      );
  }

  function setActive(id) {
    if (state.activeId === id) return;
    state.activeId = id;
    renderTabs();
    syncForm();
  }

  el.fileTabs.addEventListener("click", (e) => {
    const b = e.target.closest("[data-tab]");
    if (b) setActive(b.dataset.tab);
  });

  function syncForm() {
    const s = PR.normalize(activeSettings());
    const t = P.paperTypes[s.paperType];
    colorRadios.forEach((r) => {
      r.checked = r.value === s.color;
      r.disabled = !!t.colorOnly && r.value === "bw";
    });
    sidesRadios.forEach((r) => {
      r.checked = r.value === s.sides;
      r.disabled = !!t.singleOnly && r.value === "duplex";
    });
    el.paperSize.value = s.paper;
    el.paperType.value = s.paperType;
    el.binding.value = s.binding;
    el.copies.value = s.copies;

    const notes = [];
    if (t.colorOnly) notes.push("berwarna");
    if (t.singleOnly) notes.push("1 sisi");
    if (notes.length)
      el.paperHint.textContent = `${V.typeLabel(s.paperType)} hanya bisa dicetak ${notes.join(" dan ")}, jadi pengaturan disesuaikan otomatis.`;
    else if (t.add)
      el.paperHint.textContent = `${V.typeLabel(s.paperType)} menambah ${rpTight(t.add)} per halaman (belum termasuk pengali ukuran kertas).`;
    else el.paperHint.textContent = "";
  }

  function updateSettings(patch) {
    const target = activeSettings();
    Object.assign(target, patch);
    Object.assign(target, PR.normalize(target));
    state.defaults = { ...target };
    syncForm();
    renderSummary();
  }

  colorRadios.forEach((r) =>
    r.addEventListener("change", () => {
      if (r.checked) updateSettings({ color: r.value });
    }),
  );
  sidesRadios.forEach((r) =>
    r.addEventListener("change", () => {
      if (r.checked) updateSettings({ sides: r.value });
    }),
  );
  el.paperSize.addEventListener("change", () =>
    updateSettings({ paper: el.paperSize.value }),
  );
  el.paperType.addEventListener("change", () =>
    updateSettings({ paperType: el.paperType.value }),
  );
  el.binding.addEventListener("change", () =>
    updateSettings({ binding: el.binding.value }),
  );

  function setCopies(v) {
    const n = Math.min(C.maxCopies, Math.max(1, parseInt(v, 10) || 1));
    updateSettings({ copies: n });
  }
  el.copies.addEventListener("input", () => {
    if (el.copies.value !== "") setCopies(el.copies.value);
  });
  el.copies.addEventListener("blur", () => setCopies(el.copies.value));
  el.copiesMinus.addEventListener("click", () =>
    setCopies(activeSettings().copies - 1),
  );
  el.copiesPlus.addEventListener("click", () =>
    setCopies(activeSettings().copies + 1),
  );

  el.btnApplyAll.addEventListener("click", () => {
    const s = { ...activeSettings() };
    state.files.forEach((f) => {
      f.settings = { ...s };
    });
    renderSummary();
    el.btnApplyAll.textContent = "Sudah diterapkan ✓";
    setTimeout(() => {
      el.btnApplyAll.textContent = "Terapkan pengaturan ini ke semua file";
    }, 1600);
  });

  /* ---------- validasi ---------- */
  function validate() {
    const problems = [];
    const notes = [];
    if (state.address.length < 5) {
      el.address.setAttribute("aria-invalid", "true");
      el.addressError.textContent =
        "Isi alamat lengkap dan patokan agar kurir mudah menemukanmu.";
      el.addressError.hidden = false;
      problems.push({ node: el.address, msg: "alamat penerima" });
    }
    const ph = V.parsePhone(state.phone);
    if (!ph.ok) {
      el.phone.setAttribute("aria-invalid", "true");
      el.phoneError.textContent = ph.error;
      el.phoneError.hidden = false;
      problems.push({ node: el.phone, msg: "nomor telepon" });
    }
    if (!state.files.length) {
      showFileError("Upload dokumen PDF atau DOCX dulu.");
      problems.push({ node: el.dropzone, msg: "file dokumen" });
    } else {
      if (state.files.some((f) => f.loading)) {
        notes.push("Tunggu sampai semua dokumen selesai dibaca.");
        problems.push({ node: el.fileList, msg: null });
      }
      const bad = state.files.find((f) => !f.loading && !f.range.ok);
      if (bad) {
        setActive(bad.id);
        problems.push({
          node: q(cardOf(bad.id), "range"),
          msg: `rentang halaman ${bad.name}`,
        });
      }
    }
    return { problems, notes };
  }

  /* ============================================================
     QRIS dummy & pembayaran
     ============================================================ */
  function mulberry32(a) {
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function drawQr(seedText) {
    const N = 29;
    let seed = 0;
    for (const ch of seedText) seed = (seed * 31 + ch.charCodeAt(0)) | 0;
    const rnd = mulberry32(seed);
    const cells = [];
    const inFinder = (x, y) =>
      (x < 8 && y < 8) || (x >= N - 8 && y < 8) || (x < 8 && y >= N - 8);
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        if (!inFinder(x, y) && rnd() > 0.52)
          cells.push(`<rect x="${x}" y="${y}" width="1" height="1"/>`);
      }
    }
    const finder = (ox, oy) =>
      `<rect x="${ox}" y="${oy}" width="7" height="7" rx="1.4"/>` +
      `<rect x="${ox + 1}" y="${oy + 1}" width="5" height="5" rx="1" fill="#fff"/>` +
      `<rect x="${ox + 2}" y="${oy + 2}" width="3" height="3" rx=".6"/>`;
    el.qr.innerHTML =
      `<svg viewBox="-1 -1 ${N + 2} ${N + 2}" fill="#0f2419" shape-rendering="crispEdges" aria-hidden="true">` +
      cells.join("") +
      finder(0, 0) +
      finder(N - 7, 0) +
      finder(0, N - 7) +
      "</svg>";
  }

  let timerId = null;
  let lastFocus = null;
  let pendingId = null; // pesanan berstatus 'pending' yang dibuat saat QRIS ditampilkan

  function buildOrder() {
    const calc = priceOrder();
    return {
      campus: { id: campus().id, name: campus().name },
      address: state.address,
      phone: V.parsePhone(state.phone).value,
      distanceKm: Number(state.distanceKm.toFixed(2)),
      etaMin: etaMinutes(),
      files: state.files.map((f, i) => ({
        name: f.name,
        size: f.size,
        pages: f.pages,
        range: f.range.all ? "Semua" : f.range.label,
        printPages: f.range.count,
        options: PR.normalize(f.settings),
        price: { print: calc.items[i].print, binding: calc.items[i].binding },
      })),
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
    };
  }

  async function openPay() {
    // Periksa ulang kode promo (pemakaian bisa berubah dari tab lain) sebelum QRIS tampil.
    state.promoUses = await window.KilatDB.usedPromos();
    const before = state.promoCode;
    renderSummary();
    if (before && !state.promoCode) {
      el.formError.textContent = `Kode promo ${before} tidak berlaku lagi, jadi total diperbarui. Periksa ringkasan lalu coba lagi.`;
      el.formError.hidden = false;
      return;
    }
    // Simpan pesanan sebagai 'menunggu pembayaran'. Jika pelanggan batal, admin tetap bisa melihatnya.
    const data = buildOrder();
    const existing = pendingId
      ? await window.KilatDB.updateOrder(pendingId, data)
      : null;
    if (!existing) {
      const created = await window.KilatDB.createOrder(data);
      pendingId = created.id;
    }
    drawQr(`KILAT-${Date.now()}-${data.price.total}`);
    el.payAmount.textContent = rp(data.price.total);
    el.payView.hidden = false;
    el.paySuccess.hidden = true;
    el.btnPaid.disabled = false;
    el.btnPaid.textContent = "Simulasikan pembayaran berhasil";

    let left = 300;
    const paint = () => {
      const m = String(Math.floor(left / 60)).padStart(2, "0");
      const s = String(left % 60).padStart(2, "0");
      el.payTimer.textContent = `${m}:${s}`;
    };
    paint();
    clearInterval(timerId);
    timerId = setInterval(() => {
      left -= 1;
      paint();
      if (left <= 0) {
        closePay();
        el.formError.textContent =
          'Waktu pembayaran habis. Tekan "Lanjut ke pembayaran" untuk membuat QRIS baru.';
        el.formError.hidden = false;
      }
    }, 1000);

    lastFocus = document.activeElement;
    el.modal.hidden = false;
    document.body.classList.add("modal-open");
    el.btnPaid.focus();
  }

  function closePay() {
    clearInterval(timerId);
    el.modal.hidden = true;
    document.body.classList.remove("modal-open");
    if (lastFocus) lastFocus.focus();
  }

  el.modal.addEventListener("click", (e) => {
    if (e.target.closest("[data-close]")) closePay();
  });
  document.addEventListener("keydown", (e) => {
    if (el.modal.hidden) return;
    if (e.key === "Escape" && !el.payView.hidden) closePay();
    if (e.key === "Tab") {
      const f = [...el.modal.querySelectorAll("button:not([disabled])")].filter(
        (n) => n.offsetParent !== null,
      );
      if (!f.length) return;
      const first = f[0],
        last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });

  el.btnPaid.addEventListener("click", async () => {
    el.btnPaid.disabled = true;
    el.btnPaid.textContent = "Memeriksa pembayaran…";
    await sleep(1400);
    clearInterval(timerId);
    let order = pendingId ? await window.KilatDB.markPaid(pendingId) : null;
    if (!order) {
      const created = await window.KilatDB.createOrder(buildOrder());
      order = await window.KilatDB.markPaid(created.id);
    }
    el.payView.hidden = true;
    el.paySuccess.hidden = false;
    await sleep(1300);
    window.location.href = "tracking.html?id=" + encodeURIComponent(order.id);
  });

  /* ---------- tombol utama ---------- */
  el.btnPay.addEventListener("click", () => {
    el.formError.hidden = true;
    const { problems, notes } = validate();
    const msgs = [];
    const named = problems.filter((p) => p.msg).map((p) => p.msg);
    if (named.length) msgs.push("Lengkapi dulu: " + named.join(", ") + ".");
    msgs.push(...notes);
    if (!inRadius())
      msgs.push(
        `Alamatmu di luar radius ${C.radiusKm} km dari kampus, jadi belum bisa kami antar.`,
      );
    if (msgs.length) {
      el.formError.textContent = msgs.join(" ");
      el.formError.hidden = false;
      const target = problems.length ? problems[0].node : el.address;
      target.scrollIntoView({ behavior: "smooth", block: "center" });
      if (target.focus && target !== el.dropzone && target !== el.fileList)
        target.focus({ preventScroll: true });
      return;
    }
    openPay();
  });

  /* ---------- mulai ---------- */
  window.KilatDB.usedPromos().then((u) => {
    state.promoUses = u;
  });
  renderCampusHint();
  syncForm();
  renderTabs();
  renderSummary();
})();
