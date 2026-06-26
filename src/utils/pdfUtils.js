import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

export async function generatePdfFromElements({
  elements,
  cards,
  includeBackside,
  backsideImgDataUrl, // if includeBackside is true, pass the data URL of the backside image here
  packName,
  onProgress, // callback: (progress, total, statusText) => void
}) {
  const total = cards.length;
  onProgress(0, total, 'Preparing cards...');

  // Bounded wait for React offscreen render and asset loading
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

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const cardWidth = 63.5;
  const cardHeight = 88.0;
  const gapX = 2.0; // 2mm margin/gap between cards horizontally
  const gapY = 2.0; // 2mm margin/gap between cards vertically
  const xStart = (210 - (cardWidth * 3 + gapX * 2)) / 2; // Centered margin: 7.75 mm
  const yStart = (297 - (cardHeight * 3 + gapY * 2)) / 2; // Centered margin: 14.5 mm
  const cardsPerPage = 9;
  const totalPages = Math.ceil(cards.length / cardsPerPage);

  for (let pageNum = 0; pageNum < totalPages; pageNum++) {
    if (pageNum > 0) {
      pdf.addPage();
    }

    const startIdx = pageNum * cardsPerPage;
    const endIdx = Math.min(startIdx + cardsPerPage, cards.length);
    const pageCardsCount = endIdx - startIdx;

    // 1. Draw card fronts
    for (let i = startIdx; i < endIdx; i++) {
      const slotIdx = i - startIdx;
      const row = Math.floor(slotIdx / 3);
      const col = slotIdx % 3;

      const cardElement = elements[i];
      if (!cardElement) continue;

      onProgress(i, total, `Capturing "${cards[i].name}" (${i + 1}/${cards.length})...`);
      
      const canvas = await html2canvas(cardElement, {
        scale: 3.0,
        useCORS: true,
        backgroundColor: null,
        logging: false
      });

      const imgData = canvas.toDataURL('image/png');
      const x = xStart + col * (cardWidth + gapX);
      const y = yStart + row * (cardHeight + gapY);

      pdf.addImage(imgData, 'PNG', x, y, cardWidth, cardHeight);

      // Thin cutting guide border
      pdf.setDrawColor(220, 220, 220);
      pdf.setLineWidth(0.05);
      pdf.rect(x, y, cardWidth, cardHeight);

      onProgress(i + 1, total, `Captured "${cards[i].name}"`);
    }

    // 2. Draw corresponding backsides
    if (includeBackside && backsideImg) {
      pdf.addPage();
      onProgress(endIdx, total, `Generating backside sheet for page ${pageNum + 1}...`);
      
      for (let slotIdx = 0; slotIdx < pageCardsCount; slotIdx++) {
        const row = Math.floor(slotIdx / 3);
        const col = slotIdx % 3;
        // Mirror columns for duplex printing
        const mirroredCol = 2 - col;

        const x = xStart + mirroredCol * (cardWidth + gapX);
        const y = yStart + row * (cardHeight + gapY);

        pdf.addImage(backsideImg, 'PNG', x, y, cardWidth, cardHeight);

        // Thin cutting guide border
        pdf.setDrawColor(220, 220, 220);
        pdf.setLineWidth(0.05);
        pdf.rect(x, y, cardWidth, cardHeight);
      }
    }
  }

  onProgress(total, total, 'Saving PDF...');
  const fileName = packName ? `${packName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_pack.pdf` : 'custom_cards.pdf';
  pdf.save(fileName);
}

export async function generatePdfForTokens({
  tokens,
  quantities,
  baseSize,
  spacing,
  packName,
  onProgress
}) {
  onProgress('Preparing tokens...');

  // Wait for assets/fonts to be ready
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
    return;
  }

  for (let i = 0; i < printItems.length; i++) {
    const tok = printItems[i];
    onProgress(`Adding token ${i + 1} of ${printItems.length}...`);

    // Get bounding box dimensions relative to canvas (512 x 512 default)
    const bbox = tok.bbox || { x: 0, y: 0, w: 512, h: 512 };
    const canvasW = tok.canvasW || 512;
    const canvasH = tok.canvasH || 512;

    const w_mm = (bbox.w / canvasW) * baseSize;
    const h_mm = (bbox.h / canvasH) * baseSize;

    // Check wrapping horizontally
    if (x + w_mm + margin > 210) {
      x = margin;
      y = y + currentRowHeight + gap;
      currentRowHeight = 0;
    }

    // Check wrapping vertically (new page)
    if (y > margin && y + h_mm + margin > 297) {
      pdf.addPage();
      x = margin;
      y = margin;
      currentRowHeight = 0;
    }

    const srcImage = tok.croppedDataUrl || tok.imageDataUrl;
    if (srcImage) {
      pdf.addImage(srcImage, 'PNG', x, y, w_mm, h_mm);
    }

    // Draw light grey cutting guide border around bounding box
    pdf.setDrawColor(220, 220, 220);
    pdf.setLineWidth(0.05);
    pdf.rect(x, y, w_mm, h_mm);

    x += w_mm + gap;
    currentRowHeight = Math.max(currentRowHeight, h_mm);
  }

  onProgress('Saving PDF...');
  const fileName = packName ? `${packName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_tokens.pdf` : 'custom_tokens.pdf';
  pdf.save(fileName);
}

export async function generatePdfForComponents({
  components,
  quantities,
  options,
  packName,
  onProgress
}) {
  onProgress(0, 100, 'Preparing components...');
  await document.fonts.ready;

  // Filter components with quantity > 0
  const printItems = [];
  components.forEach(c => {
    const qty = quantities[c.id] || 0;
    for (let k = 0; k < qty; k++) {
      printItems.push(c);
    }
  });

  if (printItems.length === 0) {
    onProgress(0, 100, 'No components to print.');
    return;
  }

  const total = printItems.length;

  if (options.printType === 'centered') {
    // Determine orientation of first page
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

      // Draw component centered
      const w_mm = comp.widthMm;
      const h_mm = comp.heightMm;
      const x = (pageW - w_mm) / 2;
      const y = (pageH - h_mm) / 2;

      if (comp.canvasData) {
        pdf.addImage(comp.canvasData, 'PNG', x, y, w_mm, h_mm);
      }

      // Draw physical border outline
      pdf.setDrawColor(200, 200, 200);
      pdf.setLineWidth(0.05);
      pdf.rect(x, y, w_mm, h_mm);

      // Draw bleed boundary if checked
      if (options.includeBleed && comp.bleedMm > 0) {
        pdf.setDrawColor(239, 68, 68);
        pdf.setLineWidth(0.1);
        pdf.setLineDashPattern([2, 2], 0);
        pdf.rect(x + comp.bleedMm, y + comp.bleedMm, w_mm - 2 * comp.bleedMm, h_mm - 2 * comp.bleedMm);
        pdf.setLineDashPattern([], 0);
      }

      // Draw fold lines if checked
      if (options.includeFolds && comp.foldLines && comp.foldLines.length > 0) {
        pdf.setDrawColor(59, 130, 246);
        pdf.setLineWidth(0.15);
        pdf.setLineDashPattern([3, 2], 0);

        comp.foldLines.forEach(fold => {
          const pos = parseFloat(fold.positionMm);
          if (isNaN(pos) || pos <= 0) return;

          if (fold.type === 'vertical') {
            if (pos < w_mm) {
              pdf.line(x + pos, y, x + pos, y + h_mm);
            }
          } else if (fold.type === 'horizontal') {
            if (pos < h_mm) {
              pdf.line(x, y + pos, x + w_mm, y + pos);
            }
          }
        });
        pdf.setLineDashPattern([], 0);
      }
    }

    onProgress(total, total, 'Saving PDF...');
    const fileName = packName ? `${packName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_components.pdf` : 'custom_components.pdf';
    pdf.save(fileName);

  } else {
    // Tiled Grid Flow layout wrapping
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

      // Wrapping checks
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
        pdf.addImage(comp.canvasData, 'PNG', x, y, w_mm, h_mm);
      }

      // Cut guide
      pdf.setDrawColor(220, 220, 220);
      pdf.setLineWidth(0.05);
      pdf.rect(x, y, w_mm, h_mm);

      // Bleed
      if (options.includeBleed && comp.bleedMm > 0) {
        pdf.setDrawColor(239, 68, 68);
        pdf.setLineWidth(0.08);
        pdf.setLineDashPattern([1.5, 1.5], 0);
        pdf.rect(x + comp.bleedMm, y + comp.bleedMm, w_mm - 2 * comp.bleedMm, h_mm - 2 * comp.bleedMm);
        pdf.setLineDashPattern([], 0);
      }

      // Folds
      if (options.includeFolds && comp.foldLines && comp.foldLines.length > 0) {
        pdf.setDrawColor(59, 130, 246);
        pdf.setLineWidth(0.12);
        pdf.setLineDashPattern([2, 1.5], 0);

        comp.foldLines.forEach(fold => {
          const pos = parseFloat(fold.positionMm);
          if (isNaN(pos) || pos <= 0) return;

          if (fold.type === 'vertical') {
            if (pos < w_mm) {
              pdf.line(x + pos, y, x + pos, y + h_mm);
            }
          } else if (fold.type === 'horizontal') {
            if (pos < h_mm) {
              pdf.line(x, y + pos, x + w_mm, y + pos);
            }
          }
        });
        pdf.setLineDashPattern([], 0);
      }

      x += w_mm + gap;
      currentRowHeight = Math.max(currentRowHeight, h_mm);
    }

    onProgress(total, total, 'Saving PDF...');
    const fileName = packName ? `${packName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_components_grid.pdf` : 'custom_components_grid.pdf';
    pdf.save(fileName);
  }
}


