/* ============================================================
   Print Kilat — lapisan data
   Prototype ini menyimpan pesanan di localStorage BROWSER (tanpa server).
   Artinya admin, kurir, dan pelanggan hanya saling melihat data jika
   memakai browser yang sama. Semua fungsi async supaya nanti bisa diganti
   ke Supabase/Firebase tanpa mengubah halaman lain (lihat README).

   Alur status:  pending → paid → printing → picked_up → on_the_way → delivered
   ============================================================ */
window.KilatDB = (() => {
  const KEY = 'printkilat.orders.v2';
  const FLOW = ['paid', 'printing', 'picked_up', 'on_the_way', 'delivered'];

  const read = () => {
    try { return JSON.parse(localStorage.getItem(KEY)) || []; }
    catch { return []; }
  };
  const write = (list) => {
    try { localStorage.setItem(KEY, JSON.stringify(list)); return true; }
    catch { return false; }
  };
  const makeId = (taken) => {
    const d = new Date();
    const stamp = String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0');
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789';
    let id;
    do {
      let s = '';
      for (let i = 0; i < 4; i++) s += chars[Math.floor(Math.random() * chars.length)];
      id = `PK-${stamp}-${s}`;
    } while (taken.has(id));
    return id;
  };

  return {
    FLOW,

    /** Buat pesanan baru berstatus "pending" (menunggu pembayaran). */
    async createOrder(data) {
      const list = read();
      const now = Date.now();
      const order = {
        ...data,
        id: makeId(new Set(list.map((o) => o.id))),
        createdAt: now,
        status: 'pending',
        history: { pending: now }
      };
      list.unshift(order);
      write(list.slice(0, 200));
      return order;
    },

    /** Tandai pembayaran berhasil. */
    async markPaid(id) {
      const list = read();
      const o = list.find((x) => x.id === id);
      if (!o) return null;
      const now = Date.now();
      o.status = 'paid';
      o.paidAt = now;
      o.history = { ...(o.history || {}), paid: now };
      write(list);
      return o;
    },

    /** Kurir memajukan pesanan ke tahap berikutnya (sekaligus "mengklaim" pesanan). */
    async advance(id, courier) {
      const list = read();
      const o = list.find((x) => x.id === id);
      if (!o) return { ok: false, error: 'Pesanan tidak ditemukan.' };
      const i = FLOW.indexOf(o.status);
      if (i === -1 || i === FLOW.length - 1) return { ok: false, error: 'Pesanan ini tidak bisa dimajukan.' };
      if (o.courier && o.courier.username !== courier.username) {
        return { ok: false, error: `Pesanan ini sedang dikerjakan kurir ${o.courier.name}.` };
      }
      const next = FLOW[i + 1];
      if (!o.courier) o.courier = { username: courier.username, name: courier.name };
      o.status = next;
      o.history = { ...(o.history || {}), [next]: Date.now() };
      write(list);
      return { ok: true, order: o };
    },

    async getOrder(id) { return read().find((o) => o.id === id) || null; },
    async latestOrder() { return read()[0] || null; },
    async latestPaidOrder() { return read().find((o) => o.status !== 'pending') || read()[0] || null; },
    async listOrders() { return read(); },

    async updateOrder(id, patch) {
      const list = read();
      const i = list.findIndex((o) => o.id === id);
      if (i === -1) return null;
      list[i] = { ...list[i], ...patch };
      write(list);
      return list[i];
    },

    /** Dipakai admin untuk data contoh. Urutan list = terbaru dulu. */
    async importOrders(items) {
      const list = read();
      const taken = new Set(list.map((o) => o.id));
      const added = items.map((it) => {
        const id = it.id || makeId(taken);
        taken.add(id);
        return { ...it, id };
      });
      write([...added, ...list].slice(0, 200));
    },

    async clearAll() { write([]); },

    /** Dipanggil saat data berubah dari TAB LAIN di browser yang sama. */
    subscribe(cb) {
      const h = (e) => { if (e.key === KEY) cb(); };
      window.addEventListener('storage', h);
      return () => window.removeEventListener('storage', h);
    }
  };
})();
