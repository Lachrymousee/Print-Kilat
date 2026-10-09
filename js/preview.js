/* ============================================================
   Print Kilat — preview dokumen
   Setiap file punya pengendali preview sendiri: KilatPreview.create()
   PDF  : dirender halaman per halaman dengan pdf.js (jumlah halaman akurat)
   DOCX : dikonversi ke HTML dengan mammoth.js (jumlah halaman = perkiraan)
   Semua proses terjadi di browser. File tidak dikirim ke server mana pun.
   ============================================================ */
window.KilatPreview = (() => {
  const PDF_WORKER =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  const WORDS_PER_PAGE = 400;

  function create() {
    let pdfDoc = null;
    let current = 1;
    let task = null;
    const stage = document.createElement("div");
    stage.className = "preview-stage";
    stage.setAttribute("aria-label", "Pratinjau dokumen");

    const extOf = (file) => (file.name.split(".").pop() || "").toLowerCase();

    async function open(file) {
      close();
      const buf = await file.arrayBuffer();
      const ext = extOf(file);
      if (ext === "pdf") return openPdf(buf);
      if (ext === "docx") return openDocx(buf);
      throw new Error("Format file tidak didukung");
    }

    async function openPdf(buf) {
      if (!window.pdfjsLib)
        throw new Error("Pustaka PDF belum termuat. Periksa koneksi internet.");
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDF_WORKER;
      pdfDoc = await window.pdfjsLib.getDocument({ data: buf }).promise;
      stage.appendChild(document.createElement("canvas"));
      await renderPage(1);
      return { kind: "pdf", pages: pdfDoc.numPages, estimated: false };
    }

    async function renderPage(n) {
      const page = await pdfDoc.getPage(n);
      const canvas = stage.querySelector("canvas");
      const base = page.getViewport({ scale: 1 });
      const width = Math.max(240, stage.clientWidth - 32);
      const scale = (width / base.width) * (window.devicePixelRatio || 1);
      const viewport = page.getViewport({ scale });
      if (task) {
        try {
          task.cancel();
        } catch (e) {
          /* abaikan */
        }
      }
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      task = page.render({ canvasContext: canvas.getContext("2d"), viewport });
      try {
        await task.promise;
        current = n;
      } catch (e) {
        if (!e || e.name !== "RenderingCancelledException") throw e;
      }
    }

    async function openDocx(buf) {
      if (!window.mammoth)
        throw new Error(
          "Pustaka DOCX belum termuat. Periksa koneksi internet.",
        );
      const result = await window.mammoth.convertToHtml({ arrayBuffer: buf });
      const paper = document.createElement("div");
      paper.className = "docx-paper";
      paper.innerHTML =
        result.value || "<p><em>Dokumen ini tidak memiliki teks.</em></p>";
      stage.appendChild(paper);
      const words = (paper.textContent || "")
        .trim()
        .split(/\s+/)
        .filter(Boolean).length;
      return {
        kind: "docx",
        pages: Math.max(1, Math.ceil(words / WORDS_PER_PAGE)),
        estimated: true,
      };
    }

    async function goTo(n) {
      if (!pdfDoc) return 1;
      await renderPage(Math.min(Math.max(1, n), pdfDoc.numPages));
      stage.scrollTop = 0;
      return current;
    }

    /** Panggil setelah stage dipasang ke halaman agar PDF dirender sesuai lebarnya. */
    async function refit() {
      if (pdfDoc) await renderPage(current);
    }

    function close() {
      if (task) {
        try {
          task.cancel();
        } catch (e) {
          /* abaikan */
        }
        task = null;
      }
      if (pdfDoc) {
        try {
          pdfDoc.destroy();
        } catch (e) {
          /* abaikan */
        }
        pdfDoc = null;
      }
      stage.innerHTML = "";
      current = 1;
    }

    return {
      stage,
      open,
      goTo,
      refit,
      close,
      get page() {
        return current;
      },
    };
  }

  return { create };
})();
