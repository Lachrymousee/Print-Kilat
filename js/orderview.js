/* ============================================================
   Print Kilat — pembantu tampilan pesanan (dipakai admin, kurir, pelacakan)
   Satu pesanan bisa berisi beberapa file, masing-masing dengan pengaturan sendiri.
   ============================================================ */
window.KilatOrderView = (() => {
  const P = () => window.KILAT_CONFIG.pricing;
  const short = (label) => String(label || "").split(" · ")[0];

  const colorLabel = (c) => (c === "color" ? "Berwarna" : "Hitam putih");
  const sidesLabel = (s) => (s === "duplex" ? "Bolak-balik" : "1 sisi");
  const sizeLabel = (k) => short((P().sizes[k] || {}).label) || k;
  const typeLabel = (k) => short((P().paperTypes[k] || {}).label) || k;
  const bindLabel = (k) => (P().binding[k] || {}).label || "-";

  /** Daftar ciri cetak satu file, contoh: ["A4","HVS 70 gsm","Hitam putih","1 sisi","Jilid spiral"] */
  function specParts(f) {
    const o = f.options || {};
    const parts = [
      sizeLabel(o.paper),
      typeLabel(o.paperType),
      colorLabel(o.color),
      sidesLabel(o.sides),
    ];
    if (o.binding && o.binding !== "none") parts.push(bindLabel(o.binding));
    return parts;
  }

  /** "12 hal × 2" + keterangan rentang bila bukan semua halaman */
  function pagesLabel(f) {
    const copies = (f.options && f.options.copies) || 1;
    const range = f.range && f.range !== "Semua" ? ` (hal. ${f.range})` : "";
    return `${f.printPages} hal × ${copies}${range}`;
  }

  const files = (o) => (o && Array.isArray(o.files) ? o.files : []);
  const title = (o) => {
    const fs = files(o);
    if (!fs.length) return "-";
    return fs[0].name + (fs.length > 1 ? ` +${fs.length - 1} file` : "");
  };
  const totalSheets = (o) =>
    files(o).reduce(
      (a, f) => a + f.printPages * ((f.options && f.options.copies) || 1),
      0,
    );

  return {
    colorLabel,
    sidesLabel,
    sizeLabel,
    typeLabel,
    bindLabel,
    specParts,
    pagesLabel,
    files,
    title,
    totalSheets,
  };
})();
