import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * Save a jsPDF document.
 * - In Electron: writes the PDF buffer to the user's Downloads folder via IPC,
 *   returning the absolute saved path so CMYK conversion can reference it.
 * - In browser: falls back to the normal jsPDF download behaviour.
 *
 * @param {jsPDF} pdf
 * @param {string} fileName
 * @returns {Promise<string|null>} Absolute path (Electron only) or null (browser)
 */
async function savePdf(pdf, fileName) {
  if (typeof window !== 'undefined' && window.electronAPI?.savePdf) {
    const buffer = pdf.output('arraybuffer');
    const uint8 = new Uint8Array(buffer);
    const result = await window.electronAPI.savePdf(fileName, uint8);
    if (!result.ok) throw new Error(result.error);
    return result.savedPath;
  }
  // Browser fallback
  pdf.save(fileName);
  return null;
}

/**
 * Export cards to one or more PDF files, splitting by cardsPerFile to avoid
 * the jsPDF "invalid string length" crash that occurs with too many large PNG blobs.
 *
 * @param {object} opts
 * @param {HTMLElement[]} opts.elements   - Offscreen rendered card DOM elements
 * @param {object[]}      opts.cards      - Card data objects (for names/progress)
 * @param {boolean}       opts.includeBackside
 * @param {string}        opts.backsideImgDataUrl
 * @param {string}        opts.packName
 * @param {number}        opts.cardsPerFile  - Max cards per output PDF (default 18)
 * @param {Function}      opts.onProgress    - (progress, total, statusText) => void
 * @param {Function}      opts.onFileCount   - (n) => void  called with number of files being produced
 * @returns {Promise<string[]>} Absolute paths of saved files (Electron) or [] (browser)
 */
export async function generatePdfFromElements({
  elements,
  cards,
  includeBackside,
  backsideImgDataUrl,
  packName,
  cardsPerFile = 18,
  onProgress,
  onFileCount,
}) {
  const total = cards.length;
  onProgress(0, total, 'Preparing cards...');

  await document.fonts.ready;
  await new Promise(resolve => setTimeout(resolve, 1200));

  let backsideImg = null;
  if (includeBackside) {
    onProgress(0, total, 'Loading backside template...');
    backsideImg = await new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = backsideImgDataUrl || './img/Layout/Backside.png';
    });
  }

  const cardWidth = 63.5;
  const cardHeight = 88.0;
  const gapX = 2.0;
  const gapY = 2.0;
  const xStart = (210 - (cardWidth * 3 + gapX * 2)) / 2;
  const yStart = (297 - (cardHeight * 3 + gapY * 2)) / 2;
  const cardsPerPage = 9;

  // Split card indices into chunks
  const chunks = [];
  for (let i = 0; i < total; i += cardsPerFile) {
    chunks.push(cards.slice(i, i + cardsPerFile).map((_, j) => i + j));
  }

  if (onFileCount) onFileCount(chunks.length);

  const savedPaths = [];

  for (let chunkIdx = 0; chunkIdx < chunks.length; chunkIdx++) {
    const chunkCardIndices = chunks[chunkIdx];
    const chunkCards = chunkCardIndices.map(i => cards[i]);
    const chunkElements = chunkCardIndices.map(i => elements[i]);
    const chunkTotal = chunkCards.length;
    const totalPages = Math.ceil(chunkTotal / cardsPerPage);

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    for (let pageNum = 0; pageNum < totalPages; pageNum++) {
      if (pageNum > 0) pdf.addPage();

      const startIdx = pageNum * cardsPerPage;
      const endIdx = Math.min(startIdx + cardsPerPage, chunkTotal);
      const pageCardsCount = endIdx - startIdx;

      // Draw card fronts
      for (let i = startIdx; i < endIdx; i++) {
        const slotIdx = i - startIdx;
        const row = Math.floor(slotIdx / 3);
        const col = slotIdx % 3;

        const globalIdx = chunkCardIndices[i];
        const cardElement = chunkElements[i];
        if (!cardElement) continue;

        onProgress(
          globalIdx,
          total,
          `File ${chunkIdx + 1}/${chunks.length} — Capturing "${chunkCards[i].name}" (${i + 1}/${chunkTotal})...`
        );

        const canvas = await html2canvas(cardElement, {
          scale: 3.0,
          useCORS: true,
          backgroundColor: null,
          logging: false
        });

        const imgData = canvas.toDataURL('image/png');
        const x = xStart + col * (cardWidth + gapX);
        const y = yStart + row * (cardHeight + gapY);

        // OPTIMIZATION: 'FAST' compression prevents huge uncompressed image sizes in the PDF
        pdf.addImage(imgData, 'PNG', x, y, cardWidth, cardHeight, undefined, 'FAST');

        pdf.setDrawColor(220, 220, 220);
        pdf.setLineWidth(0.05);
        pdf.rect(x, y, cardWidth, cardHeight);

        onProgress(globalIdx + 1, total, `Captured "${chunkCards[i].name}"`);
      }

      // Backsides page
      if (includeBackside && backsideImg) {
        pdf.addPage();
        onProgress(
          chunkCardIndices[endIdx - 1],
          total,
          `Generating backside sheet (file ${chunkIdx + 1}, page ${pageNum + 1})...`
        );

        for (let slotIdx = 0; slotIdx < pageCardsCount; slotIdx++) {
          const row = Math.floor(slotIdx / 3);
          const col = slotIdx % 3;
          const mirroredCol = 2 - col;

          const x = xStart + mirroredCol * (cardWidth + gapX);
          const y = yStart + row * (cardHeight + gapY);

          pdf.addImage(backsideImg, 'PNG', x, y, cardWidth, cardHeight, undefined, 'FAST');

          pdf.setDrawColor(220, 220, 220);
          pdf.setLineWidth(0.05);
          pdf.rect(x, y, cardWidth, cardHeight);
        }
      }
    }

    onProgress(
      chunkCardIndices[chunkCardIndices.length - 1] + 1,
      total,
      `Saving file ${chunkIdx + 1} of ${chunks.length}...`
    );

    const suffix = chunks.length > 1 ? `_part${chunkIdx + 1}` : '';
    const baseName = packName
      ? `${packName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_pack`
      : 'custom_cards';
    const fileName = `${baseName}${suffix}.pdf`;

    const savedPath = await savePdf(pdf, fileName);
    if (savedPath) savedPaths.push(savedPath);

    // Brief pause between files so the browser doesn't freeze
    if (chunkIdx < chunks.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 400));
    }
  }

  return savedPaths;
}

/**
 * Export tokens to a PDF file.
 *
 * @returns {Promise<string|null>} Absolute path (Electron) or null (browser)
 */
export async function generatePdfForTokens({
  tokens,
  quantities,
  baseSize,
  spacing,
  packName,
  onProgress
}) {
  onProgress('Preparing tokens...');

  await document.fonts.ready;

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const margin = 15;
  const gap = spacing;
  let x = margin;
  let y = margin;
  let currentRowHeight = 0;

  const printItems = [];
  tokens.forEach(tok => {
    const qty = quantities[tok.id] || 0;
    for (let k = 0; k < qty; k++) {
      printItems.push(tok);
    }
  });

  if (printItems.length === 0) {
    onProgress('No tokens to print.');
    return null;
  }

  for (let i = 0; i < printItems.length; i++) {
    const tok = printItems[i];
    onProgress(`Adding token ${i + 1} of ${printItems.length}...`);

    const bbox = tok.bbox || { x: 0, y: 0, w: 512, h: 512 };
    const canvasW = tok.canvasW || 512;
    const canvasH = tok.canvasH || 512;

    const w_mm = (bbox.w / canvasW) * baseSize;
    const h_mm = (bbox.h / canvasH) * baseSize;

    if (x + w_mm + margin > 210) {
      x = margin;
      y = y + currentRowHeight + gap;
      currentRowHeight = 0;
    }

    if (y > margin && y + h_mm + margin > 297) {
      pdf.addPage();
      x = margin;
      y = margin;
      currentRowHeight = 0;
    }

    const srcImage = tok.croppedDataUrl || tok.imageDataUrl;
    if (srcImage) {
      pdf.addImage(srcImage, 'PNG', x, y, w_mm, h_mm, undefined, 'FAST');
    }

    pdf.setDrawColor(220, 220, 220);
    pdf.setLineWidth(0.05);
    pdf.rect(x, y, w_mm, h_mm);

    x += w_mm + gap;
    currentRowHeight = Math.max(currentRowHeight, h_mm);
  }

  onProgress('Saving PDF...');
  const fileName = packName
    ? `${packName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_tokens.pdf`
    : 'custom_tokens.pdf';

  return await savePdf(pdf, fileName);
}

/**
 * Export board components to a PDF file.
 *
 * @returns {Promise<string|null>} Absolute path (Electron) or null (browser)
 */
export async function generatePdfForComponents({
  components,
  quantities,
  options,
  packName,
  onProgress
}) {
  onProgress(0, 100, 'Preparing components...');
  await document.fonts.ready;

  const printItems = [];
  components.forEach(c => {
    const qty = quantities[c.id] || 0;
    for (let k = 0; k < qty; k++) {
      printItems.push(c);
    }
  });

  if (printItems.length === 0) {
    onProgress(0, 100, 'No components to print.');
    return null;
  }

  const total = printItems.length;

  if (options.printType === 'centered') {
    const firstComp = printItems[0];
    const firstLandscape = firstComp.widthMm > firstComp.heightMm;
    const pdf = new jsPDF({
      orientation: firstLandscape ? 'landscape' : 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    for (let i = 0; i < printItems.length; i++) {
      const comp = printItems[i];
      onProgress(i, total, `Rendering page ${i + 1} of ${total}: ${comp.name}...`);

      if (i > 0) {
        const isLandscape = comp.widthMm > comp.heightMm;
        pdf.addPage('a4', isLandscape ? 'landscape' : 'portrait');
      }

      const isLandscape = comp.widthMm > comp.heightMm;
      const pageW = isLandscape ? 297 : 210;
      const pageH = isLandscape ? 210 : 297;

      const w_mm = comp.widthMm;
      const h_mm = comp.heightMm;
      const x = (pageW - w_mm) / 2;
      const y = (pageH - h_mm) / 2;

      if (comp.canvasData) {
        pdf.addImage(comp.canvasData, 'PNG', x, y, w_mm, h_mm, undefined, 'FAST');
      }

      pdf.setDrawColor(200, 200, 200);
      pdf.setLineWidth(0.05);
      pdf.rect(x, y, w_mm, h_mm);

      if (options.includeBleed && comp.bleedMm > 0) {
        pdf.setDrawColor(239, 68, 68);
        pdf.setLineWidth(0.1);
        pdf.setLineDashPattern([2, 2], 0);
        pdf.rect(x + comp.bleedMm, y + comp.bleedMm, w_mm - 2 * comp.bleedMm, h_mm - 2 * comp.bleedMm);
        pdf.setLineDashPattern([], 0);
      }

      if (options.includeFolds && comp.foldLines && comp.foldLines.length > 0) {
        pdf.setDrawColor(59, 130, 246);
        pdf.setLineWidth(0.15);
        pdf.setLineDashPattern([3, 2], 0);

        comp.foldLines.forEach(fold => {
          const pos = parseFloat(fold.positionMm);
          if (isNaN(pos) || pos <= 0) return;

          if (fold.type === 'vertical') {
            if (pos < w_mm) pdf.line(x + pos, y, x + pos, y + h_mm);
          } else if (fold.type === 'horizontal') {
            if (pos < h_mm) pdf.line(x, y + pos, x + w_mm, y + pos);
          }
        });
        pdf.setLineDashPattern([], 0);
      }
    }

    onProgress(total, total, 'Saving PDF...');
    const fileName = packName
      ? `${packName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_components.pdf`
      : 'custom_components.pdf';

    return await savePdf(pdf, fileName);

  } else {
    // Tiled Grid Flow
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const margin = 15;
    const gap = options.spacing || 4;
    let x = margin;
    let y = margin;
    let currentRowHeight = 0;

    for (let i = 0; i < printItems.length; i++) {
      const comp = printItems[i];
      onProgress(i, total, `Tiling component ${i + 1} of ${total}: ${comp.name}...`);

      const w_mm = comp.widthMm;
      const h_mm = comp.heightMm;

      if (x + w_mm + margin > 210) {
        x = margin;
        y = y + currentRowHeight + gap;
        currentRowHeight = 0;
      }

      if (y > margin && y + h_mm + margin > 297) {
        pdf.addPage();
        x = margin;
        y = margin;
        currentRowHeight = 0;
      }

      if (comp.canvasData) {
        pdf.addImage(comp.canvasData, 'PNG', x, y, w_mm, h_mm, undefined, 'FAST');
      }

      pdf.setDrawColor(220, 220, 220);
      pdf.setLineWidth(0.05);
      pdf.rect(x, y, w_mm, h_mm);

      if (options.includeBleed && comp.bleedMm > 0) {
        pdf.setDrawColor(239, 68, 68);
        pdf.setLineWidth(0.08);
        pdf.setLineDashPattern([1.5, 1.5], 0);
        pdf.rect(x + comp.bleedMm, y + comp.bleedMm, w_mm - 2 * comp.bleedMm, h_mm - 2 * comp.bleedMm);
        pdf.setLineDashPattern([], 0);
      }

      if (options.includeFolds && comp.foldLines && comp.foldLines.length > 0) {
        pdf.setDrawColor(59, 130, 246);
        pdf.setLineWidth(0.12);
        pdf.setLineDashPattern([2, 1.5], 0);

        comp.foldLines.forEach(fold => {
          const pos = parseFloat(fold.positionMm);
          if (isNaN(pos) || pos <= 0) return;

          if (fold.type === 'vertical') {
            if (pos < w_mm) pdf.line(x + pos, y, x + pos, y + h_mm);
          } else if (fold.type === 'horizontal') {
            if (pos < h_mm) pdf.line(x, y + pos, x + w_mm, y + pos);
          }
        });
        pdf.setLineDashPattern([], 0);
      }

      x += w_mm + gap;
      currentRowHeight = Math.max(currentRowHeight, h_mm);
    }

    onProgress(total, total, 'Saving PDF...');
    const fileName = packName
      ? `${packName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_components_grid.pdf`
      : 'custom_components_grid.pdf';

    return await savePdf(pdf, fileName);
  }
}
