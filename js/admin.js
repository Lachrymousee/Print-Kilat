/* ============================================================
   Print Kilat — dashboard admin
   Total pesanan · masih berjalan · pendapatan · riwayat pesanan (dengan filter)
   ============================================================ */
(() => {
  'use strict';
  const C = window.KILAT_CONFIG;
  const DB = window.KilatDB;
  const session = window.KilatAuth.current();
  if (!session || session.role !== 'admin') return; // guard di <head> sudah mengalihkan

  const $ = (s) => document.querySelector(s);
  const LABEL = C.statusLabels;
  const RUNNING = ['paid', 'printing', 'picked_up', 'on_the_way'];
  const money = (n) => 'Rp' + Math.round(n).toLocaleString('id-ID');
  const kmFmt = (n) => Number(n).toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' km';
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const dt = (ts) => ts ? new Date(ts).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '-';

  const FILTERS = [
    ['all', 'Semua', () => true],
    ['running', 'Berjalan', (o) => RUNNING.includes(o.status)],
    ['delivered', 'Selesai', (o) => o.status === 'delivered'],
    ['pending', 'Menunggu pembayaran', (o) => o.status === 'pending']
  ];
  let filter = 'all';
  const openIds = new Set();

  $('#whoLabel').textContent = session.label;
  $('#hello').textContent = `Halo, ${session.name}.`;
  $('#btnLogout').addEventListener('click', () => window.KilatAuth.logout());

  /* ---------- render ---------- */
  function detailHtml(o) {
    const opt = o.options || {};
    const price = o.price || {};
    const bind = C.pricing.binding[opt.binding]?.label || '-';
    const hist = C.statusLabels;
    const histItems = Object.keys(hist)
      .filter((k) => o.history && o.history[k])
      .map((k) => `<li>${esc(hist[k])} <b>${dt(o.history[k])}</b></li>`).join('');
    return `
      <div class="o-detail">
        <dl class="o-grid">
          <div><dt>Tujuan</dt><dd>${esc(o.address)}<br>${esc(o.campus?.name)}</dd></div>
          <div><dt>Jarak &amp; estimasi</dt><dd>${kmFmt(o.distanceKm ?? 0)} · ${esc(o.etaMin)} menit</dd></div>
          <div><dt>Cetak</dt><dd>${esc(o.file?.pages)} hal × ${esc(opt.copies)} · ${opt.color === 'color' ? 'Berwarna' : 'Hitam putih'}, ${opt.sides === 'duplex' ? 'bolak-balik' : '1 sisi'}, ${esc(opt.paper)}, ${esc(bind)}</dd></div>
          <div><dt>Kurir</dt><dd>${o.courier ? esc(o.courier.name) : 'Belum ada'}</dd></div>
          <div><dt>Rincian harga</dt><dd>Cetak ${money(price.print || 0)} · Jilid ${money(price.binding || 0)}<br>Ongkir ${money(price.delivery || 0)} · Platform ${money(price.platform || 0)}</dd></div>
          <div><dt>Dibuat</dt><dd>${dt(o.createdAt)}</dd></div>
        </dl>
        <ul class="o-hist" aria-label="Riwayat status">${histItems}</ul>
      </div>`;
  }

  function rowHtml(o) {
    return `
      <details class="order-row" data-id="${esc(o.id)}"${openIds.has(o.id) ? ' open' : ''}>
        <summary>
          <div><p class="o-code">${esc(o.id)}</p><p class="o-file">${esc(o.file?.name)}</p></div>
          <span class="o-status s-${esc(o.status)}"><i></i>${esc(LABEL[o.status] || o.status)}</span>
          <strong class="o-price">${money(o.price?.total || 0)}</strong>
        </summary>
        ${detailHtml(o)}
      </details>`;
  }

  async function render() {
    const orders = await DB.listOrders();

    const running = orders.filter((o) => RUNNING.includes(o.status)).length;
    const revenue = orders.filter((o) => o.status !== 'pending').reduce((a, o) => a + (o.price?.total || 0), 0);
    $('#statTotal').textContent = orders.length.toLocaleString('id-ID');
    $('#statRunning').textContent = running.toLocaleString('id-ID');
    $('#statRevenue').textContent = money(revenue);

    $('#filters').innerHTML = FILTERS.map(([key, label, fn]) =>
      `<button type="button" class="filter" data-f="${key}" aria-pressed="${key === filter}">${label}<small>${orders.filter(fn).length}</small></button>`).join('');

    const fn = FILTERS.find((f) => f[0] === filter)[2];
    const shown = orders.filter(fn);
    $('#countChip').textContent = `${shown.length} order`;

    $('#orderList').innerHTML = shown.length
      ? shown.map(rowHtml).join('')
      : `<div class="empty-state">
           <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="m3 8 9 5 9-5M12 13v8"/></svg>
           ${orders.length ? 'Tidak ada pesanan di filter ini.' : 'Belum ada pesanan. Pesanan pelanggan akan muncul di sini.'}
         </div>`;
  }

  $('#filters').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-f]');
    if (!b) return;
    filter = b.dataset.f;
    render();
  });
  $('#orderList').addEventListener('toggle', (e) => {
    const d = e.target;
    if (!d.dataset || !d.dataset.id) return;
    if (d.open) openIds.add(d.dataset.id); else openIds.delete(d.dataset.id);
  }, true);

  /* ---------- alat demo ---------- */
  function sample(file, pages, copies, color, binding, status, minsAgo, courier) {
    const created = Date.now() - minsAgo * 60000;
    const opts = { color, sides: 'single', paper: 'A4', binding, copies };
    const campus = C.campuses[0];
    const km = campus.defaultDistanceKm;
    const history = { pending: created };
    const order = {
      campus: { id: campus.id, name: campus.name },
      address: 'Kost Green Park, lantai 2, kamar 203',
      distanceKm: km,
      etaMin: Math.round((km / C.courierKmh) * 60) + C.prepMinutes,
      file: { name: file, size: 240000, pages },
      options: opts,
      price: window.KilatPricing.calc({ ...opts, pages }),
      createdAt: created,
      status,
      history
    };
    if (status !== 'pending') {
      const flow = window.KilatDB.FLOW;
      const upto = flow.indexOf(status);
      for (let i = 0; i <= upto; i++) history[flow[i]] = created + (i + 1) * 90000;
      order.paidAt = history.paid;
      if (courier && upto >= 1) order.courier = courier;
    }
    return order;
  }

  $('#btnSeed').addEventListener('click', async () => {
    const raka = { username: 'raka', name: 'Raka' };
    await DB.importOrders([
      sample('proposal-skripsi.pdf', 42, 1, 'bw', 'spiral', 'on_the_way', 8, raka),
      sample('slide-presentasi.pdf', 20, 1, 'color', 'none', 'pending', 25),
      sample('laporan-magang.pdf', 36, 2, 'bw', 'spiral', 'delivered', 95, raka),
      sample('tugas-kuliah.pdf', 12, 1, 'bw', 'none', 'delivered', 180, raka),
      sample('cv-terbaru.pdf', 2, 3, 'color', 'none', 'delivered', 300, raka)
    ]);
    render();
  });

  $('#btnClear').addEventListener('click', async () => {
    if (!window.confirm('Hapus semua data pesanan di browser ini? Tindakan ini tidak bisa dibatalkan.')) return;
    openIds.clear();
    await DB.clearAll();
    render();
  });

  DB.subscribe(render);
  render();
})();
