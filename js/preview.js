/* ============================================================
   Print Kilat — preview dokumen
   PDF  : dirender halaman per halaman dengan pdf.js (jumlah halaman akurat)
   DOCX : dikonversi ke HTML dengan mammoth.js (jumlah halaman = perkiraan)
   ============================================================ */
window.KilatPreview = (() => {
  const PDF_WORKER = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  const WORDS_PER_PAGE = 400;

  let pdfDoc = null;
  let stage = null;
  let current = 1;
  let renderTask = null;

  const extOf = (file) => (file.name.split('.').pop() || '').toLowerCase();

  async function open(file, stageEl) {
    close();
    stage = stageEl;
    stage.innerHTML = '';
    const buf = await file.arrayBuffer();
    const ext = extOf(file);
    if (ext === 'pdf') return openPdf(buf);
    if (ext === 'docx') return openDocx(buf);
    throw new Error('Format file tidak didukung');
  }

  async function openPdf(buf) {
    if (!window.pdfjsLib) throw new Error('Pustaka PDF belum termuat. Periksa koneksi internet.');
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDF_WORKER;
    pdfDoc = await window.pdfjsLib.getDocument({ data: buf }).promise;
    const canvas = document.createElement('canvas');
    stage.appendChild(canvas);
    await renderPage(1);
    return { kind: 'pdf', pages: pdfDoc.numPages, estimated: false };
  }

  async function renderPage(n) {
    const page = await pdfDoc.getPage(n);
    const canvas = stage.querySelector('canvas');
    const base = page.getViewport({ scale: 1 });
    const width = Math.max(240, stage.clientWidth - 32);
    const scale = (width / base.width) * (window.devicePixelRatio || 1);
    const viewport = page.getViewport({ scale });
    if (renderTask) { try { renderTask.cancel(); } catch (e) { /* abaikan */ } }
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    renderTask = page.render({ canvasContext: canvas.getContext('2d'), viewport });
    try {
      await renderTask.promise;
      current = n;
    } catch (e) {
      if (!e || e.name !== 'RenderingCancelledException') throw e;
    }
  }

  async function openDocx(buf) {
    if (!window.mammoth) throw new Error('Pustaka DOCX belum termuat. Periksa koneksi internet.');
    const result = await window.mammoth.convertToHtml({ arrayBuffer: buf });
    const paper = document.createElement('div');
    paper.className = 'docx-paper';
    paper.innerHTML = result.value || '<p><em>Dokumen ini tidak memiliki teks.</em></p>';
    stage.appendChild(paper);
    const words = (paper.textContent || '').trim().split(/\s+/).filter(Boolean).length;
    return { kind: 'docx', pages: Math.max(1, Math.ceil(words / WORDS_PER_PAGE)), estimated: true };
  }

  async function goTo(n) {
    if (!pdfDoc) return 1;
    const target = Math.min(Math.max(1, n), pdfDoc.numPages);
    await renderPage(target);
    stage.scrollTop = 0;
    return current;
  }

  function close() {
    if (renderTask) { try { renderTask.cancel(); } catch (e) { /* abaikan */ } renderTask = null; }
    if (pdfDoc) { try { pdfDoc.destroy(); } catch (e) { /* abaikan */ } pdfDoc = null; }
    if (stage) stage.innerHTML = '';
    current = 1;
  }

  return { open, goTo, close, get page() { return current; } };
})();
