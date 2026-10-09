/* ============================================================
   Print Kilat — parser rentang halaman
   Contoh input: "1-5, 8, 11-13"  (kosong = semua halaman)
   ============================================================ */
window.KilatRange = (() => {
  // [1,2,3,5,8,9] -> "1-3, 5, 8-9"
  function compact(pages) {
    const out = [];
    let i = 0;
    while (i < pages.length) {
      let j = i;
      while (j + 1 < pages.length && pages[j + 1] === pages[j] + 1) j++;
      out.push(j > i ? `${pages[i]}-${pages[j]}` : String(pages[i]));
      i = j + 1;
    }
    return out.join(", ");
  }

  function parse(text, total) {
    const raw = String(text == null ? "" : text).trim();
    if (!raw)
      return { ok: true, all: true, count: total, label: "Semua", pages: null };

    const cleaned = raw
      .replace(/\s+/g, "")
      .replace(/[;，、]/g, ",")
      .replace(/[–—]/g, "-");
    if (!/^\d+(-\d+)?(,\d+(-\d+)?)*$/.test(cleaned)) {
      return { ok: false, error: "Tulis dengan format seperti 1-5, 8, 11-13." };
    }
    const set = new Set();
    for (const part of cleaned.split(",")) {
      const [a, b] = part.includes("-")
        ? part.split("-").map(Number)
        : [Number(part), Number(part)];
      if (a < 1 || b < 1)
        return { ok: false, error: "Nomor halaman mulai dari 1." };
      if (a > b)
        return {
          ok: false,
          error: `Rentang ${a}-${b} terbalik. Tulis ${b}-${a}.`,
        };
      if (b > total)
        return {
          ok: false,
          error: `Halaman ${b} tidak ada. Dokumen ini punya ${total} halaman.`,
        };
      for (let n = a; n <= b; n++) set.add(n);
    }
    const pages = [...set].sort((x, y) => x - y);
    return {
      ok: true,
      all: false,
      count: pages.length,
      label: compact(pages),
      pages,
    };
  }

  return { parse, compact };
})();
