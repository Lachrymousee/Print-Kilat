/* Print Kilat — landing: isi harga dari config.js supaya selalu sinkron */
(() => {
  const C = window.KILAT_CONFIG;
  if (!C) return;
  const rp = (n) => 'Rp ' + n.toLocaleString('id-ID');
  const map = {
    'pp.bw': C.pricing.perPage.bw,
    'pp.color': C.pricing.perPage.color,
    'bind.staples': C.pricing.binding.staples.price,
    'bind.spiral': C.pricing.binding.spiral.price,
    'delivery': C.pricing.deliveryFee
  };
  document.querySelectorAll('[data-price]').forEach((el) => {
    const v = map[el.dataset.price];
    if (v !== undefined) el.textContent = rp(v);
  });
})();
