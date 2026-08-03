import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { X, Download, AlertTriangle, Printer, CheckCircle, Loader } from 'lucide-react';
import { generatePdfFromElements } from '../../utils/pdfUtils.js';
import CardPreview from '../CardEditor/CardPreview.jsx';

const WARN_THRESHOLD = 27; // 3 pages — above this can cause memory issues
import { convertToCmyk, openPath } from '../../utils/desktopUtils.js';

const IS_DESKTOP = typeof window !== 'undefined' && !!window.Neutralino;

const ExportPdfModal = ({ isOpen, onClose, cards, defaultLayout, packName }) => {
  const [includeBackside, setIncludeBackside] = useState(true);
  const [cardsPerFile, setCardsPerFile] = useState(18);
  const [pageSize, setPageSize] = useState('a4'); // 'a4' | 'letter'
  const [backsideFlip, setBacksideFlip] = useState('horizontal'); // 'horizontal' | 'vertical' | 'none'
  const [isGenerating, setIsGenerating] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState(0);
  const [fileCount, setFileCount] = useState(null);

  // Post-export CMYK state (Electron only)
  const [savedPaths, setSavedPaths] = useState([]);
  const [cmykStatus, setCmykStatus] = useState(null); // null | 'converting' | 'done' | 'error'
  const [cmykError, setCmykError] = useState('');
  const [cmykOutputPaths, setCmykOutputPaths] = useState([]);

  const refs = useRef([]);

  useEffect(() => {
    if (isOpen) {
      setIsGenerating(false);
      setStatusText('');
      setProgress(0);
      setTotal(0);
      setFileCount(null);
      setSavedPaths([]);
      setCmykStatus(null);
      setCmykError('');
      setCmykOutputPaths([]);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const numFiles = Math.ceil(cards.length / Math.max(1, cardsPerFile));
  const showWarning = cardsPerFile > WARN_THRESHOLD;
  const exportDone = savedPaths.length > 0;

  const handleStartExport = async () => {
    setIsGenerating(true);
    setTotal(cards.length);
    setProgress(0);
    setFileCount(null);
    setSavedPaths([]);
    setCmykStatus(null);
    setCmykError('');
    setCmykOutputPaths([]);

    // Debug: Check refs state
    const validRefs = refs.current.filter(el => el != null);
    console.log('[PDF Export] Starting export:', {
      totalCards: cards.length,
      totalRefs: refs.current.length,
      validRefs: validRefs.length,
      firstRefDimensions: validRefs[0] ? {
        width: validRefs[0].getBoundingClientRect().width,
        height: validRefs[0].getBoundingClientRect().height,
        offsetWidth: validRefs[0].offsetWidth,
        offsetHeight: validRefs[0].offsetHeight,
      } : 'NO VALID REFS',
      isDesktop: IS_DESKTOP,
    });

    if (validRefs.length === 0) {
      alert('Error: Card preview elements are not mounted. Please try closing and re-opening the export dialog.');
      setIsGenerating(false);
      return;
    }

    try {
      const paths = await generatePdfFromElements({
        elements: refs.current,
        cards,
        includeBackside,
        backsideImgDataUrl: './img/Layout/Backside.png',
        packName,
        cardsPerFile,
        pageSize,
        backsideFlip,
        onProgress: (prog, tot, text) => {
          setProgress(prog);
          if (tot) setTotal(tot);
          setStatusText(text);
        },
        onFileCount: (n) => setFileCount(n),
      });
      console.log('[PDF Export] generatePdfFromElements returned:', paths);
      setIsGenerating(false);
      // In Desktop, stay open and show post-export actions
      if (IS_DESKTOP && paths && paths.length > 0) {
        setSavedPaths(paths);
        setStatusText('');
      } else {
        onClose();
      }
    } catch (err) {
      console.error('[PDF Export] Error:', err);
      alert('Error generating PDF: ' + err.message);
      setIsGenerating(false);
    }
  };

  const handleConvertToCmyk = async () => {
    if (!savedPaths.length) return;
    setCmykStatus('converting');
    setCmykError('');
    setCmykOutputPaths([]);

    const outputs = [];
    for (const inputPath of savedPaths) {
      const result = await convertToCmyk(inputPath);
      if (!result.ok) {
        setCmykStatus('error');
        setCmykError(result.error);
        return;
      }
      outputs.push(result.outputPath);
    }

    setCmykOutputPaths(outputs);
    setCmykStatus('done');
  };

  const handleOpenFolder = (filePath) => {
    openPath(filePath);
  };

  return (
    <>
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 2000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(0,0,0,0.85)',
      backdropFilter: 'blur(8px)',
      userSelect: 'none',
      fontFamily: 'var(--font-family)'
    }}>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>

      <div className="glass-panel animate-fade-in" style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-lg)',
        width: '480px',
        padding: '1.75rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
        boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
        position: 'relative'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            🖨️ Export PDF Layout
          </h3>
          {!isGenerating && (
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
              <X size={20} />
            </button>
          )}
        </div>

        {isGenerating ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '1.5rem 0' }}>
            <div style={{
              width: '40px',
              height: '40px',
              border: '3px solid rgba(99,102,241,0.2)',
              borderTop: '3px solid var(--color-primary)',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }} />
            <span style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 600, textAlign: 'center' }}>
              {statusText}
            </span>
            {fileCount && fileCount > 1 && (
              <span style={{ fontSize: '0.75rem', color: '#f59e0b', fontWeight: 600 }}>
                📁 Producing {fileCount} PDF files
              </span>
            )}
            <div style={{ width: '100%', height: '8px', background: 'var(--bg-main)', borderRadius: '4px', overflow: 'hidden', marginTop: '0.5rem' }}>
              <div style={{
                width: `${total > 0 ? (progress / total) * 100 : 0}%`,
                height: '100%',
                background: 'linear-gradient(90deg, var(--color-primary), #8b5cf6)',
                borderRadius: '4px',
                transition: 'width 0.2s ease-out'
              }} />
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Card {progress} of {total} processed
            </span>
          </div>

        ) : exportDone ? (
          /* ─── Post-export actions panel ─── */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

            {/* Success banner */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.6rem',
              padding: '0.75rem',
              background: 'rgba(16,185,129,0.08)',
              border: '1px solid rgba(16,185,129,0.3)',
              borderRadius: 'var(--radius-sm)'
            }}>
              <CheckCircle size={18} color="#10b981" />
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: '#10b981' }}>
                  {savedPaths.length} PDF file{savedPaths.length > 1 ? 's' : ''} saved to Downloads
                </p>
                {savedPaths.map((p, i) => (
                  <p key={i} style={{ margin: '0.15rem 0 0', fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                    {p.split(/[/\\]/).pop()}
                  </p>
                ))}
              </div>
              <button
                onClick={() => handleOpenFolder(savedPaths[0])}
                style={{ background: 'none', border: '1px solid rgba(16,185,129,0.4)', borderRadius: 'var(--radius-sm)', padding: '0.25rem 0.5rem', color: '#10b981', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 600, whiteSpace: 'nowrap' }}
              >
                Open folder
              </button>
            </div>

            {/* CMYK conversion section */}
            <div style={{
              padding: '0.75rem',
              background: 'rgba(139,92,246,0.05)',
              border: '1px solid rgba(139,92,246,0.2)',
              borderRadius: 'var(--radius-sm)',
              display: 'flex', flexDirection: 'column', gap: '0.6rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                <Printer size={16} color="#a78bfa" style={{ flexShrink: 0, marginTop: '1px' }} />
                <div>
                  <p style={{ margin: 0, fontSize: '0.82rem', fontWeight: 700, color: '#a78bfa' }}>
                    Convert to Print-Safe CMYK
                  </p>
                  <p style={{ margin: '0.2rem 0 0', fontSize: '0.7rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                    Converts the exported PDF to a print-ready CMYK color space (ideal for professional printing). Requires <strong style={{ color: 'var(--text-secondary)' }}>Ghostscript</strong> to be installed on your system.
                  </p>
                </div>
              </div>

              {(cmykStatus === null || cmykStatus === 'error') && (
                <button
                  onClick={handleConvertToCmyk}
                  style={{
                    padding: '0.5rem 0.75rem',
                    background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
                    border: 'none', borderRadius: 'var(--radius-sm)',
                    color: 'white', fontWeight: 700, cursor: 'pointer',
                    fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                    boxShadow: '0 4px 12px rgba(139,92,246,0.25)'
                  }}
                >
                  {cmykStatus === 'error' ? '🔄 Retry CMYK Conversion' : '🎨 Convert to CMYK'}
                </button>
              )}

              {cmykStatus === 'converting' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: '#a78bfa' }}>
                  <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} />
                  Converting colors to CMYK…
                </div>
              )}

              {cmykStatus === 'done' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: '#10b981', fontWeight: 700 }}>
                    <CheckCircle size={14} />
                    CMYK conversion complete!
                  </div>
                  {cmykOutputPaths.map((p, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.7rem' }}>
                      <span style={{ color: 'var(--text-muted)', fontFamily: 'monospace' }}>{p.split(/[/\\]/).pop()}</span>
                      <button
                        onClick={() => handleOpenFolder(p)}
                        style={{ background: 'none', border: '1px solid rgba(16,185,129,0.4)', borderRadius: 'var(--radius-sm)', padding: '0.2rem 0.4rem', color: '#10b981', cursor: 'pointer', fontSize: '0.65rem', fontWeight: 600 }}
                      >
                        Open folder
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {cmykStatus === 'error' && (
                <div style={{
                  padding: '0.5rem 0.75rem',
                  background: 'rgba(239,68,68,0.08)',
                  border: '1px solid rgba(239,68,68,0.3)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.72rem', color: '#f87171', lineHeight: 1.45
                }}>
                  <strong>Conversion failed:</strong><br />
                  <span style={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{cmykError}</span>
                </div>
              )}
            </div>

            <button
              onClick={onClose}
              style={{ padding: '0.55rem', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.85rem' }}
            >
              Close
            </button>
          </div>

        ) : (
          <>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.45 }}>
              Generate high-quality, print-ready PDFs with cards at standard <strong>63.5 × 88 mm</strong>. All images are exported as lossless <strong>PNG</strong>.
            </p>

            {/* Summary info */}
            <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-sm)', background: 'var(--bg-main)', border: '1px solid var(--border-color)', fontSize: '0.78rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Paper Size:</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)', textTransform: 'uppercase' }}>{pageSize} (Portrait)</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Cards Grid:</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>3 × 3 (9 cards per sheet)</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Total Cards:</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{cards.length} card{cards.length > 1 ? 's' : ''}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Output Files:</span>
                <span style={{ fontWeight: 600, color: numFiles > 1 ? '#f59e0b' : 'var(--text-primary)' }}>
                  {numFiles} PDF file{numFiles > 1 ? 's' : ''}
                  {numFiles > 1 ? ` (${packName || 'custom_cards'}_part1.pdf … _part${numFiles}.pdf)` : ''}
                </span>
              </div>
            </div>

            {/* Cards per file control */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Cards per File
                </label>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {Math.ceil(cardsPerFile / 9)} sheet{Math.ceil(cardsPerFile / 9) > 1 ? 's' : ''} / file
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="range"
                  min="9"
                  max="54"
                  step="9"
                  value={cardsPerFile}
                  onChange={e => setCardsPerFile(parseInt(e.target.value))}
                  style={{ flex: 1 }}
                />
                <span style={{
                  minWidth: '36px', textAlign: 'center', fontWeight: 700, fontSize: '0.85rem',
                  color: showWarning ? '#f59e0b' : 'var(--text-primary)'
                }}>
                  {cardsPerFile}
                </span>
              </div>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: 0 }}>
                Fewer cards per file = smaller, safer exports. Use 9–18 for packs with high-res art.
              </p>
            </div>

            {/* Warning banner */}
            {showWarning && (
              <div style={{
                display: 'flex', alignItems: 'flex-start', gap: '0.5rem',
                padding: '0.6rem 0.75rem',
                background: 'rgba(245, 158, 11, 0.08)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.75rem',
                color: '#fcd34d',
                lineHeight: 1.4
              }}>
                <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: '1px' }} />
                <span>
                  Exporting more than 27 cards at once may cause a <strong>"invalid string length"</strong> crash if cards contain large art layers. Lower the limit if you encounter errors.
                </span>
              </div>
            )}

            {/* Paper Size Option */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Paper Size</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {[
                  { id: 'a4', label: 'A4', sub: '210 × 297 mm' },
                  { id: 'letter', label: 'US Letter', sub: '215.9 × 279.4 mm' }
                ].map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPageSize(p.id)}
                    style={{
                      flex: 1, padding: '0.55rem 0.4rem', borderRadius: 'var(--radius-sm)',
                      border: pageSize === p.id ? '2px solid var(--color-primary)' : '1px solid var(--border-color)',
                      background: pageSize === p.id ? 'rgba(99, 102, 241, 0.08)' : 'transparent',
                      color: pageSize === p.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                      cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.1rem',
                      transition: 'all 0.15s'
                    }}
                  >
                    <span style={{ fontWeight: 700, fontSize: '0.8rem' }}>{p.label}</span>
                    <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>{p.sub}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Backside Option */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Backside Option</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => setIncludeBackside(false)}
                  style={{
                    flex: 1, padding: '0.75rem 0.5rem', borderRadius: 'var(--radius-sm)',
                    border: !includeBackside ? '2px solid var(--color-primary)' : '1px solid var(--border-color)',
                    background: !includeBackside ? 'rgba(99, 102, 241, 0.08)' : 'transparent',
                    color: !includeBackside ? 'var(--text-primary)' : 'var(--text-secondary)',
                    cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem',
                    transition: 'all 0.15s'
                  }}
                >
                  <span style={{ fontWeight: 700, fontSize: '0.82rem' }}>Fronts Only</span>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Print-alone backing</span>
                </button>
                <button
                  onClick={() => setIncludeBackside(true)}
                  style={{
                    flex: 1, padding: '0.75rem 0.5rem', borderRadius: 'var(--radius-sm)',
                    border: includeBackside ? '2px solid var(--color-primary)' : '1px solid var(--border-color)',
                    background: includeBackside ? 'rgba(99, 102, 241, 0.08)' : 'transparent',
                    color: includeBackside ? 'var(--text-primary)' : 'var(--text-secondary)',
                    cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem',
                    transition: 'all 0.15s'
                  }}
                >
                  <span style={{ fontWeight: 700, fontSize: '0.82rem' }}>Duplex Backside</span>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Duplex-ready backing</span>
                </button>
              </div>
            </div>

            {/* Backside Flip Option (visible only if includeBackside is true) */}
            {includeBackside && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Backside Duplex Alignment</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {[
                    { id: 'horizontal', label: 'Flip Long Edge', sub: 'Horizontal Flip' },
                    { id: 'vertical', label: 'Flip Short Edge', sub: 'Vertical Flip' },
                    { id: 'none', label: 'No Flip', sub: 'Straight Copy' }
                  ].map(f => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setBacksideFlip(f.id)}
                      style={{
                        flex: 1, padding: '0.55rem 0.4rem', borderRadius: 'var(--radius-sm)',
                        border: backsideFlip === f.id ? '2px solid var(--color-primary)' : '1px solid var(--border-color)',
                        background: backsideFlip === f.id ? 'rgba(99, 102, 241, 0.08)' : 'transparent',
                        color: backsideFlip === f.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                        cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.1rem',
                        transition: 'all 0.15s'
                      }}
                    >
                      <span style={{ fontWeight: 700, fontSize: '0.78rem' }}>{f.label}</span>
                      <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>{f.sub}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* CMYK hint (Desktop only) */}
            {IS_DESKTOP && (
              <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: 0, borderTop: '1px solid var(--border-color)', paddingTop: '0.6rem' }}>
                🎨 After exporting, you can convert the PDF to a print-ready <strong style={{ color: 'var(--text-secondary)' }}>CMYK</strong> color space.
              </p>
            )}

            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
              <button
                onClick={onClose}
                style={{ flex: 1, padding: '0.55rem', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.85rem' }}
              >
                Cancel
              </button>
              <button
                onClick={handleStartExport}
                style={{
                  flex: 2, padding: '0.55rem',
                  background: 'linear-gradient(135deg, var(--color-primary), #8b5cf6)',
                  border: 'none', borderRadius: 'var(--radius-sm)', color: 'white', fontWeight: 800, cursor: 'pointer',
                  fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem',
                  boxShadow: '0 4px 12px rgba(99, 102, 241, 0.25)'
                }}
              >
                <Download size={14} />
                Generate {numFiles > 1 ? `${numFiles} PDFs` : 'PDF'}
              </button>
            </div>
          </>
        )}

        {/* Hidden card previews are rendered via portal at body level to avoid html2canvas
             capture failures caused by the modal's backdrop-filter / fixed stacking context */}
      </div>
    </div>

    {/* Portal: hidden cards rendered directly on body so html2canvas can capture them cleanly */}
    {cards.length > 0 && ReactDOM.createPortal(
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          left: '-9999px',
          top: 0,
          width: '744px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          zIndex: -1,
          pointerEvents: 'none'
        }}
      >
        {cards.map((card, idx) => (
          <CardPreview
            key={card.id || idx}
            ref={el => refs.current[idx] = el}
            card={card}
            defaultLayout={defaultLayout}
          />
        ))}
      </div>,
      document.body
    )}
  </>
  );
};

export default ExportPdfModal;
