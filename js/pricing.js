/* ============================================================
   Print Kilat — rumus harga
   Dipakai halaman pemesanan dan data contoh admin.
   ============================================================ */
window.KilatPricing = (() => {
  const P = () => window.KILAT_CONFIG.pricing;

  /** Terapkan aturan jenis kertas (mis. kertas foto hanya berwarna, 1 sisi). */
  function normalize(s) {
    const p = P();
    const out = { ...s };
    if (!p.sizes[out.paper]) out.paper = "A4";
    if (!p.paperTypes[out.paperType]) out.paperType = "hvs70";
    const t = p.paperTypes[out.paperType];
    if (t.colorOnly) out.color = "color";
    if (t.singleOnly) out.sides = "single";
    return out;
  }

  /** Harga satu file. */
  function calc(input) {
    const p = P();
    const s = normalize(input);
    const base = p.perPage[s.color] + p.paperTypes[s.paperType].add;
    const unit =
      base *
      p.sizes[s.paper].mult *
      (s.sides === "duplex" ? 1 - p.duplexDiscount : 1);
    const print = Math.round((unit * s.pages * s.copies) / 100) * 100;
    const binding = p.binding[s.binding].price * s.copies;
    return { print, binding, subtotal: print + binding };
  }

  /* ---------- kode promo ---------- */
  const normCode = (code) => String(code || "").trim().toUpperCase().replace(/\s+/g, "");
  const rupiah = (n) => "Rp " + Math.round(n).toLocaleString("id-ID");

  function findPromo(code) {
    const c = normCode(code);
    if (!c) return null;
    return (window.KILAT_CONFIG.promos || []).find((p) => normCode(p.code) === c) || null;
  }

  /** Besar potongan sebuah promo terhadap rincian biaya {print, binding, delivery, platform}. */
  function discountFor(promo, b) {
    const base =
      promo.target === "platform" ? b.platform
      : promo.target === "delivery" ? b.delivery
      : promo.target === "print" ? b.print + b.binding
      : b.print + b.binding + b.delivery + b.platform;
    let d = promo.type === "percent" ? Math.round((base * promo.value) / 100) : promo.value;
    if (promo.maxDiscount) d = Math.min(d, promo.maxDiscount);
    return Math.max(0, Math.min(d, base)); // tagihan tidak pernah negatif
  }

  /**
   * Periksa apakah kode bisa dipakai.
   * ctx.uses = { KODE: jumlahPemakaian } untuk promo sekali pakai; ctx.now untuk pengujian.
   */
  function checkPromo(code, base, ctx = {}) {
    if (!normCode(code)) return { ok: false, error: "Masukkan kode promo dulu." };
    const promo = findPromo(code);
    if (!promo) return { ok: false, error: "Kode promo tidak ditemukan. Periksa penulisannya." };
    const now = ctx.now || new Date();
    if (promo.expires && now > new Date(promo.expires + "T23:59:59")) {
      return { ok: false, error: "Kode promo ini sudah berakhir." };
    }
    if (promo.once && ((ctx.uses || {})[promo.code] || 0) > 0) {
      return { ok: false, error: "Kode ini sudah kamu pakai di perangkat ini." };
    }
    if (promo.minSubtotal && base.print + base.binding < promo.minSubtotal) {
      return { ok: false, error: `Kode ini berlaku untuk biaya cetak minimal ${rupiah(promo.minSubtotal)}.` };
    }
    return { ok: true, promo };
  }

  /** Harga seluruh pesanan: jumlah semua file + ongkir + biaya platform (sekali per pesanan), dikurangi promo. */
  function calcOrder(items, promo) {
    const p = P();
    const lines = items.map(calc);
    const print = lines.reduce((a, l) => a + l.print, 0);
    const binding = lines.reduce((a, l) => a + l.binding, 0);
    const base = { print, binding, delivery: p.deliveryFee, platform: p.platformFee };
    const subtotal = print + binding + base.delivery + base.platform;
    const discount = promo ? discountFor(promo, base) : 0;
    return {
      items: lines,
      ...base,
      subtotal,
      discount,
      promo: promo
        ? { code: promo.code, label: promo.label, target: promo.target, discount }
        : null,
      total: subtotal - discount,
    };
  }

  return { normalize, calc, calcOrder, findPromo, checkPromo, discountFor };
})();
