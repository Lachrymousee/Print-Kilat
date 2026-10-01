/* ============================================================
   Print Kilat — pelacakan pesanan (sisi pelanggan)
   Status mengikuti aksi kurir di courier.html. Di prototype ini data
   dibagi lewat localStorage, jadi halaman ini ikut berubah ketika kurir
   menekan tombol di TAB LAIN pada browser yang sama.
   ============================================================ */
(async () => {
  'use strict';
  const C = window.KILAT_CONFIG;
  const DB = window.KilatDB;
  const $ = (s) => document.querySelector(s);
  const rp = (n) => 'Rp ' + Math.round(n).toLocaleString('id-ID');
  const kmFmt = (n) => Number(n).toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' km';
  const timeFmt = (ms) => new Date(ms).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const id = new URLSearchParams(location.search).get('id');
  let order = id ? await DB.getOrder(id) : await DB.latestPaidOrder();

  if (!order) {
    $('#empty').hidden = false;
    return;
  }
  $('#trackView').hidden = false;

  const pages = order.file.pages;
  const KEYS = ['paid', 'printing', 'picked_up', 'on_the_way', 'delivered'];
  const stages = [
    { title: 'Pembayaran diterima', desc: 'Pesananmu sudah masuk antrean cetak.' },
    { title: 'Dokumen sedang dicetak', desc: `Printer memproses ${pages} halaman.` },
    { title: 'Kurir mengambil pesanan', desc: 'Hasil cetak diambil kurir dari gerai.' },
    { title: 'Kurir dalam perjalanan', desc: `Menuju ${order.campus.name}.` },
    { title: 'Pesanan sampai', desc: 'Hasil cetak sudah tiba di tujuanmu.' }
  ];
  const headlines = {
    pending: ['Menunggu pembayaran', 'Selesaikan pembayaran agar pesananmu mulai diproses.'],
    paid: ['Pembayaran diterima', 'Pesananmu masuk antrean. Kurir akan segera memprosesnya.'],
    printing: ['Dokumenmu sedang dicetak', 'Sebentar lagi siap diambil kurir.'],
    picked_up: ['Kurir sudah mengambil pesanan', 'Pesananmu akan segera berangkat.'],
    on_the_way: ['Kurir menuju lokasimu', 'Siapkan diri, kurir sudah dalam perjalanan.'],
    delivered: ['Pesananmu sudah sampai', 'Selamat menggunakan hasil cetakmu.']
  };

  /* ---------- bagian statis ---------- */
  $('#orderCode').textContent = `Pesanan ${order.id}`;
  $('#tDistance').textContent = kmFmt(order.distanceKm);
  const colorLabel = order.options.color === 'color' ? 'Berwarna' : 'Hitam putih';
  const sidesLabel = order.options.sides === 'duplex' ? 'bolak-balik' : '1 sisi';
  const bindLabel = (C.pricing.binding[order.options.binding] || {}).label || '-';
  const rows = [
    ['File', order.file.name],
    ['Cetak', `${pages} hal × ${order.options.copies} · ${colorLabel}, ${sidesLabel}`],
    ['Kertas', order.options.paper],
    ['Jilid', bindLabel],
    ['Tujuan', `${order.address}, ${order.campus.name}`],
    ['Total', rp(order.price.total)]
  ];
  $('#orderLines').innerHTML = rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('');
  $('#demoNote').textContent = 'Status diperbarui oleh kurir. Untuk mencoba, masuk sebagai kurir di tab lain lalu tekan tombol progres.';

  const tl = $('#timeline');
  tl.innerHTML = stages.map((s, i) => `
    <li class="tl-item" data-i="${i}">
      <span class="tl-dot"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg></span>
      <div><p class="tl-title">${s.title}</p><p class="tl-desc">${esc(s.desc)}</p></div>
      <span class="tl-time"></span>
    </li>`).join('');
  const items = [...tl.children];

  const vehicles = ['Motor · B 4821 KLT', 'Motor · B 3307 PKL', 'Motor · B 6150 KLT'];
  const travelMin = Math.max(1, Math.round((order.distanceKm / C.courierKmh) * 60));

  /* ---------- paint ---------- */
  function paint() {
    const idx = KEYS.indexOf(order.status); // -1 jika masih 'pending'
    const last = KEYS.length - 1;
    const h = headlines[order.status] || headlines.pending;
    $('#statusTitle').textContent = h[0];
    $('#statusText').textContent = h[1];

    items.forEach((li, i) => {
      li.classList.toggle('is-done', i < idx || (i === idx && idx === last));
      li.classList.toggle('is-now', i === idx && idx < last);
      const t = order.history && order.history[KEYS[i]];
      li.querySelector('.tl-time').textContent = i <= idx && t ? timeFmt(t) : '';
    });

    // posisi kurir di rute: bergerak selama status "dalam perjalanan"
    const onWaySince = order.history && order.history.on_the_way;
    let p = 0;
    if (order.status === 'on_the_way') {
      const secs = (Date.now() - (onWaySince || Date.now())) / 1000;
      p = Math.min(0.92, Math.max(0.06, secs / (travelMin * 60)));
    } else if (order.status === 'delivered') {
      p = 1;
    }
    $('#routeFill').style.width = (p * 100) + '%';
    const rider = $('#rider');
    rider.style.left = (p * 100) + '%';
    rider.classList.toggle('is-waiting', idx < 3);

    // estimasi tiba
    let eta;
    if (order.status === 'delivered') eta = 'Sudah tiba';
    else if (order.status === 'on_the_way') {
      const mins = (Date.now() - (onWaySince || Date.now())) / 60000;
      eta = `${Math.max(1, Math.ceil(travelMin - mins))} menit`;
    } else eta = `${order.etaMin} menit`;
    $('#tEta').textContent = eta;

    // kurir
    const c = order.courier;
    $('#courier').hidden = !c;
    $('#courierWait').hidden = !!c;
    if (c) {
      const hash = [...c.username].reduce((a, ch) => a + ch.charCodeAt(0), 0);
      $('#courierAvatar').textContent = c.name[0];
      $('#courierName').textContent = `Kurir ${c.name}`;
      $('#courierVehicle').textContent = vehicles[hash % vehicles.length] + ' (data demo)';
    }

    $('#doneBanner').hidden = order.status !== 'delivered';
    $('#demoChip').textContent = order.status === 'delivered' ? 'Selesai' : (order.status === 'pending' ? 'Belum dibayar' : 'Live');
  }

  async function refresh() {
    const fresh = await DB.getOrder(order.id);
    if (fresh) order = fresh;
    paint();
  }

  DB.subscribe(refresh);
  setInterval(paint, 1000); // menggerakkan posisi kurir dan estimasi waktu
  paint();
})();
