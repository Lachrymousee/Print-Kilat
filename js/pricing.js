/* Print Kilat — rumus harga (dipakai halaman pemesanan dan data contoh admin) */
window.KilatPricing = {
  calc({ pages, copies, color, sides, paper, binding }) {
    const P = window.KILAT_CONFIG.pricing;
    const unit = P.perPage[color] * P.sizeMultiplier[paper] * (sides === 'duplex' ? 1 - P.duplexDiscount : 1);
    const print = Math.round((unit * pages * copies) / 100) * 100;
    const bind = P.binding[binding].price * copies;
    return {
      print,
      binding: bind,
      delivery: P.deliveryFee,
      platform: P.platformFee,
      total: print + bind + P.deliveryFee + P.platformFee
    };
  }
};
