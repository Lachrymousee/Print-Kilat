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

  /** Harga seluruh pesanan: jumlah semua file + ongkir + biaya platform (sekali per pesanan). */
  function calcOrder(items) {
    const p = P();
    const lines = items.map(calc);
    const print = lines.reduce((a, l) => a + l.print, 0);
    const binding = lines.reduce((a, l) => a + l.binding, 0);
    return {
      items: lines,
      print,
      binding,
      delivery: p.deliveryFee,
      platform: p.platformFee,
      total: print + binding + p.deliveryFee + p.platformFee,
    };
  }

  return { normalize, calc, calcOrder };
})();
