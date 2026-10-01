/* ============================================================
   Print Kilat — logika halaman pemesanan
   Alur: tujuan → upload + preview → detail cetak → ringkasan
         → popup QRIS dummy → simpan pesanan → tracking.html
   ============================================================ */
(() => {
  'use strict';
  const C = window.KILAT_CONFIG;
  const P = C.pricing;
  const $ = (sel) => document.querySelector(sel);
  const rp = (n) => 'Rp ' + Math.round(n).toLocaleString('id-ID');
  const rpTight = (n) => rp(n).replace('Rp ', 'Rp');
  const kmFmt = (n) => n.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' km';
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  /* ---------- state ---------- */
  const state = {
    campusId: C.campuses[0].id,
    address: '',
    distanceKm: C.campuses[0].defaultDistanceKm,
    userCoords: null,          // diisi jika pelanggan membagikan lokasi
    file: null,                // { name, size, ext }
    pages: 0,
    pagesEstimated: false,
    color: 'bw',
    sides: 'single',
    paper: 'A4',
    binding: 'none',
    copies: 1
  };

  /* ---------- elemen ---------- */
  const el = {
    campus: $('#campus'), campusHint: $('#campusHint'),
    address: $('#address'), addressError: $('#addressError'),
    btnGeo: $('#btnGeo'), geoStatus: $('#geoStatus'),
    dropzone: $('#dropzone'), file: $('#file'), fileError: $('#fileError'),
    preview: $('#preview'), stage: $('#previewStage'), fileBadge: $('#fileBadge'),
    fileName: $('#fileName'), fileSub: $('#fileSub'), btnRemove: $('#btnRemove'),
    pager: $('#pager'), prev: $('#prevPage'), next: $('#nextPage'), pageInfo: $('#pageInfo'),
    pagesEdit: $('#pagesEdit'), pagesInput: $('#pagesInput'), previewNote: $('#previewNote'),
    binding: $('#binding'), paper: $('#paper'),
    copies: $('#copies'), copiesMinus: $('#copiesMinus'), copiesPlus: $('#copiesPlus'),
    etaBox: $('#etaBox'), etaMain: $('#etaMain'), etaTo: $('#etaTo'),
    lines: $('#lines'), total: $('#total'), formError: $('#formError'), btnPay: $('#btnPay'),
    modal: $('#payModal'), qr: $('#qr'), payAmount: $('#payAmount'), payTimer: $('#payTimer'),
    btnPaid: $('#btnPaid'), payView: $('#payView'), paySuccess: $('#paySuccess')
  };

  const campus = () => C.campuses.find((c) => c.id === state.campusId);

  /* ---------- perhitungan ---------- */
  function etaMinutes() {
    return Math.round((state.distanceKm / C.courierKmh) * 60) + C.prepMinutes;
  }
  const inRadius = () => state.distanceKm <= C.radiusKm;

  function calc() {
    return window.KilatPricing.calc(state);
  }

  /* ---------- render ---------- */
  function renderSummary() {
    const c = calc();
    const rows = [
      [`${state.pages} hal × ${state.copies} · ${state.color === 'color' ? 'Berwarna' : 'Hitam putih'}`, c.print]
    ];
    if (state.binding !== 'none') rows.push([P.binding[state.binding].label, c.binding]);
    rows.push([`Ongkir radius ${C.radiusKm} km`, c.delivery], ['Biaya platform', c.platform]);
    el.lines.innerHTML = rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${rp(v)}</dd></div>`).join('');
    el.total.textContent = rp(c.total);

    const out = !inRadius();
    el.etaBox.classList.toggle('is-out', out);
    el.etaMain.textContent = out
      ? `${kmFmt(state.distanceKm)} · di luar radius ${C.radiusKm} km`
      : `${kmFmt(state.distanceKm)} · ${etaMinutes()} menit`;
    el.etaTo.textContent = out ? 'Pilih titik kampus lain atau alamat yang lebih dekat.' : `Ke ${campus().name}`;
  }

  function renderCampusHint() {
    el.campusHint.textContent = `Layanan aktif dalam radius ${C.radiusKm} km · ${campus().address}`;
  }

  function renderFileInfo() {
    if (!state.file) return;
    const size = state.file.size >= 1048576
      ? (state.file.size / 1048576).toFixed(1).replace('.', ',') + ' MB'
      : Math.max(1, Math.round(state.file.size / 1024)) + ' KB';
    el.fileSub.textContent = `${size} · ${state.pages} halaman${state.pagesEstimated ? ' (perkiraan)' : ''}`;
  }

  /* ---------- init pilihan ---------- */
  el.campus.innerHTML = C.campuses.map((c) => `<option value="${c.id}">${c.name}</option>`).join('');
  el.binding.innerHTML = Object.entries(P.binding)
    .map(([k, b]) => `<option value="${k}">${b.label}${b.price ? ' · ' + rpTight(b.price) : ''}</option>`).join('');
  el.paper.innerHTML = [['A4', 'A4 · standar'], ['A3', 'A3 · ukuran besar'], ['A5', 'A5 · ukuran kecil']]
    .map(([v, l]) => `<option value="${v}">${l}</option>`).join('');

  /* ---------- tujuan & lokasi ---------- */
  function haversineKm(a, b) {
    const R = 6371, rad = (d) => (d * Math.PI) / 180;
    const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }

  function updateDistance() {
    if (state.userCoords) {
      state.distanceKm = haversineKm(state.userCoords, campus()) * C.roadFactor;
    } else {
      state.distanceKm = campus().defaultDistanceKm;
    }
  }

  el.campus.addEventListener('change', () => {
    state.campusId = el.campus.value;
    updateDistance();
    renderCampusHint();
    renderSummary();
  });

  el.address.addEventListener('input', () => {
    state.address = el.address.value.trim();
    el.address.removeAttribute('aria-invalid');
    el.addressError.hidden = true;
  });

  el.btnGeo.addEventListener('click', () => {
    if (!navigator.geolocation) {
      el.geoStatus.textContent = 'Browser ini tidak mendukung lokasi. Jarak memakai perkiraan titik antar.';
      return;
    }
    el.btnGeo.disabled = true;
    el.geoStatus.textContent = 'Membaca lokasimu…';
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        state.userCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        updateDistance();
        el.btnGeo.disabled = false;
        el.geoStatus.textContent = inRadius()
          ? 'Lokasi terbaca. Jarak dihitung dari posisimu.'
          : `Lokasimu sekitar ${kmFmt(state.distanceKm)} dari kampus, di luar radius layanan.`;
        renderSummary();
      },
      () => {
        el.btnGeo.disabled = false;
        el.geoStatus.textContent = 'Izin lokasi belum diberikan. Jarak tetap memakai perkiraan titik antar.';
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });

  /* ---------- upload & preview ---------- */
  function showFileError(msg) {
    el.fileError.textContent = msg;
    el.fileError.hidden = !msg;
    el.dropzone.classList.toggle('is-invalid', !!msg);
  }

  async function handleFile(file) {
    showFileError('');
    if (!file) return;
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    if (!['pdf', 'docx'].includes(ext)) {
      return showFileError('Format belum didukung. Pilih file PDF atau DOCX.');
    }
    if (file.size > C.maxFileMB * 1024 * 1024) {
      return showFileError(`Ukuran file melebihi ${C.maxFileMB} MB. Kecilkan file lalu coba lagi.`);
    }

    el.preview.hidden = false;
    el.stage.innerHTML = '<div class="loading-row"><span class="spinner"></span>Menyiapkan preview…</div>';
    el.fileBadge.textContent = ext.toUpperCase();
    el.fileName.textContent = file.name;
    el.fileSub.textContent = 'Membaca dokumen…';

    try {
      const info = await window.KilatPreview.open(file, el.stage);
      state.file = { name: file.name, size: file.size, ext };
      state.pages = info.pages;
      state.pagesEstimated = info.estimated;

      const isPdf = info.kind === 'pdf';
      el.pager.hidden = !isPdf;
      el.pagesEdit.hidden = isPdf;
      el.previewNote.hidden = isPdf;
      el.pagesInput.value = state.pages;
      updatePager(1);
      renderFileInfo();
      renderSummary();
    } catch (err) {
      resetFile();
      showFileError('File tidak bisa dibuka. ' + (err && err.message ? err.message : 'Coba file lain.'));
    }
  }

  function updatePager(n) {
    el.pageInfo.textContent = `Halaman ${n} dari ${state.pages}`;
    el.prev.disabled = n <= 1;
    el.next.disabled = n >= state.pages;
  }

  async function goPage(delta) {
    const target = window.KilatPreview.page + delta;
    el.prev.disabled = el.next.disabled = true;
    const now = await window.KilatPreview.goTo(target);
    updatePager(now);
  }
  el.prev.addEventListener('click', () => goPage(-1));
  el.next.addEventListener('click', () => goPage(1));

  el.pagesInput.addEventListener('input', () => {
    const v = parseInt(el.pagesInput.value, 10);
    if (v >= 1 && v <= 999) {
      state.pages = v;
      renderFileInfo();
      renderSummary();
    }
  });

  function resetFile() {
    window.KilatPreview.close();
    state.file = null;
    state.pages = 0;
    state.pagesEstimated = false;
    el.file.value = '';
    el.preview.hidden = true;
    renderSummary();
  }
  el.btnRemove.addEventListener('click', () => { showFileError(''); resetFile(); });
  el.file.addEventListener('change', () => handleFile(el.file.files[0]));

  ['dragenter', 'dragover'].forEach((ev) =>
    el.dropzone.addEventListener(ev, (e) => { e.preventDefault(); el.dropzone.classList.add('is-drag'); }));
  ['dragleave', 'drop'].forEach((ev) =>
    el.dropzone.addEventListener(ev, (e) => { e.preventDefault(); el.dropzone.classList.remove('is-drag'); }));
  el.dropzone.addEventListener('drop', (e) => handleFile(e.dataTransfer.files[0]));

  /* ---------- detail cetak ---------- */
  document.querySelectorAll('input[name="color"]').forEach((r) =>
    r.addEventListener('change', () => { state.color = r.value; renderSummary(); }));
  document.querySelectorAll('input[name="sides"]').forEach((r) =>
    r.addEventListener('change', () => { state.sides = r.value; renderSummary(); }));
  el.binding.addEventListener('change', () => { state.binding = el.binding.value; renderSummary(); });
  el.paper.addEventListener('change', () => { state.paper = el.paper.value; renderSummary(); });

  function setCopies(v) {
    const n = Math.min(C.maxCopies, Math.max(1, parseInt(v, 10) || 1));
    state.copies = n;
    el.copies.value = n;
    renderSummary();
  }
  el.copies.addEventListener('input', () => {
    if (el.copies.value !== '') setCopies(el.copies.value);
  });
  el.copies.addEventListener('blur', () => setCopies(el.copies.value));
  el.copiesMinus.addEventListener('click', () => setCopies(state.copies - 1));
  el.copiesPlus.addEventListener('click', () => setCopies(state.copies + 1));

  /* ---------- validasi ---------- */
  function validate() {
    const problems = [];
    if (state.address.length < 5) {
      el.address.setAttribute('aria-invalid', 'true');
      el.addressError.textContent = 'Isi alamat lengkap dan patokan agar kurir mudah menemukanmu.';
      el.addressError.hidden = false;
      problems.push({ node: el.address, msg: 'alamat penerima' });
    }
    if (!state.file) {
      showFileError('Upload dokumen PDF atau DOCX dulu.');
      problems.push({ node: el.dropzone, msg: 'file dokumen' });
    }
    if (state.file && state.pages < 1) {
      problems.push({ node: el.pagesInput, msg: 'jumlah halaman' });
    }
    return problems;
  }

  /* ---------- QRIS dummy ---------- */
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
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
        if (!inFinder(x, y) && rnd() > 0.52) cells.push(`<rect x="${x}" y="${y}" width="1" height="1"/>`);
      }
    }
    const finder = (ox, oy) =>
      `<rect x="${ox}" y="${oy}" width="7" height="7" rx="1.4"/>` +
      `<rect x="${ox + 1}" y="${oy + 1}" width="5" height="5" rx="1" fill="#fff"/>` +
      `<rect x="${ox + 2}" y="${oy + 2}" width="3" height="3" rx=".6"/>`;
    el.qr.innerHTML =
      `<svg viewBox="-1 -1 ${N + 2} ${N + 2}" fill="#0f2419" shape-rendering="crispEdges" aria-hidden="true">` +
      cells.join('') + finder(0, 0) + finder(N - 7, 0) + finder(0, N - 7) + '</svg>';
  }

  let timerId = null;
  let lastFocus = null;
  let pendingId = null; // pesanan berstatus 'pending' yang dibuat saat QRIS ditampilkan

  async function openPay() {
    // Simpan pesanan sebagai 'menunggu pembayaran'. Jika pelanggan batal, admin tetap bisa melihatnya.
    const data = buildOrder();
    const existing = pendingId ? await window.KilatDB.updateOrder(pendingId, data) : null;
    if (!existing) {
      const created = await window.KilatDB.createOrder(data);
      pendingId = created.id;
    }
    const c = calc();
    drawQr(`KILAT-${Date.now()}-${c.total}`);
    el.payAmount.textContent = rp(c.total);
    el.payView.hidden = false;
    el.paySuccess.hidden = true;
    el.btnPaid.disabled = false;
    el.btnPaid.textContent = 'Simulasikan pembayaran berhasil';

    let left = 300;
    const paint = () => {
      const m = String(Math.floor(left / 60)).padStart(2, '0');
      const s = String(left % 60).padStart(2, '0');
      el.payTimer.textContent = `${m}:${s}`;
    };
    paint();
    clearInterval(timerId);
    timerId = setInterval(() => {
      left -= 1;
      paint();
      if (left <= 0) {
        closePay();
        el.formError.textContent = 'Waktu pembayaran habis. Tekan "Lanjut ke pembayaran" untuk membuat QRIS baru.';
        el.formError.hidden = false;
      }
    }, 1000);

    lastFocus = document.activeElement;
    el.modal.hidden = false;
    document.body.classList.add('modal-open');
    el.btnPaid.focus();
  }

  function closePay() {
    clearInterval(timerId);
    el.modal.hidden = true;
    document.body.classList.remove('modal-open');
    if (lastFocus) lastFocus.focus();
  }

  el.modal.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) closePay(); });
  document.addEventListener('keydown', (e) => {
    if (el.modal.hidden) return;
    if (e.key === 'Escape' && !el.payView.hidden) closePay();
    if (e.key === 'Tab') {
      const f = [...el.modal.querySelectorAll('button:not([disabled])')].filter((n) => n.offsetParent !== null);
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  function buildOrder() {
    const c = calc();
    return {
      campus: { id: campus().id, name: campus().name },
      address: state.address,
      distanceKm: Number(state.distanceKm.toFixed(2)),
      etaMin: etaMinutes(),
      file: { name: state.file.name, size: state.file.size, pages: state.pages },
      options: { color: state.color, sides: state.sides, paper: state.paper, binding: state.binding, copies: state.copies },
      price: c
    };
  }

  el.btnPaid.addEventListener('click', async () => {
    el.btnPaid.disabled = true;
    el.btnPaid.textContent = 'Memeriksa pembayaran…';
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
    window.location.href = 'tracking.html?id=' + encodeURIComponent(order.id);
  });

  /* ---------- tombol utama ---------- */
  el.btnPay.addEventListener('click', () => {
    el.formError.hidden = true;
    const problems = validate();
    const msgs = [];
    if (problems.length) msgs.push('Lengkapi dulu: ' + problems.map((p) => p.msg).join(', ') + '.');
    if (!inRadius()) msgs.push(`Alamatmu di luar radius ${C.radiusKm} km dari kampus, jadi belum bisa kami antar.`);
    if (msgs.length) {
      el.formError.textContent = msgs.join(' ');
      el.formError.hidden = false;
      const target = problems.length ? problems[0].node : el.address;
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      if (target.focus && target !== el.dropzone) target.focus({ preventScroll: true });
      return;
    }
    openPay();
  });

  /* ---------- mulai ---------- */
  renderCampusHint();
  renderSummary();
})();
