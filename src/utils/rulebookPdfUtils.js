import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export async function exportRulebookToPdf(rulebook) {
  let format = rulebook.pageSize;
  let wMm = 210, hMm = 297;

  if (format === 'a4') {
    wMm = 210; hMm = 297;
  } else if (format === 'letter') {
    format = 'letter';
    wMm = 215.9; hMm = 279.4;
  } else {
    format = [rulebook.customWidthMm || 210, rulebook.customHeightMm || 297];
    wMm = rulebook.customWidthMm || 210; hMm = rulebook.customHeightMm || 297;
  }

  const orientation = rulebook.orientation === 'landscape' ? 'l' : 'p';
  if (orientation === 'l') {
    const tmp = wMm; wMm = hMm; hMm = tmp;
  }

  const doc = new jsPDF({
    orientation,
    unit: 'mm',
    format: format,
    compress: true
  });

  // Query rendered page elements in the DOM
  const pageElements = Array.from(document.querySelectorAll('.rulebook-page-canvas'));

  if (pageElements.length === 0) {
    alert("Could not find rulebook page elements to export.");
    return;
  }

  // Temporarily hide edit guides (dashed borders & add block buttons)
  const hideElements = Array.from(document.querySelectorAll('.hide-on-export'));
  hideElements.forEach(el => el.style.display = 'none');

  try {
    for (let pageIdx = 0; pageIdx < pageElements.length; pageIdx++) {
      if (pageIdx > 0) {
        doc.addPage();
      }

      const pageEl = pageElements[pageIdx];

      const canvas = await html2canvas(pageEl, {
        scale: 2.5, // High resolution rendering for sharp print text
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
        logging: false
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      doc.addImage(imgData, 'JPEG', 0, 0, wMm, hMm);
    }

    const safeTitle = (rulebook.title || 'Rulebook').replace(/[^a-z0-9_-]/gi, '_');
    doc.save(`${safeTitle}.pdf`);
  } catch (error) {
    console.error("PDF Export error:", error);
    alert("An error occurred while generating the PDF export.");
  } finally {
    // Restore hidden elements
    hideElements.forEach(el => el.style.display = '');
  }
}
