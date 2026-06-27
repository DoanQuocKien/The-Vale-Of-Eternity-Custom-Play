import React, { useState, useRef } from 'react';
import { X, Download, AlertTriangle } from 'lucide-react';
import { generatePdfFromElements } from '../../utils/pdfUtils.js';
import CardPreview from '../CardEditor/CardPreview.jsx';

const WARN_THRESHOLD = 27; // 3 pages — above this can cause memory issues

const ExportPdfModal = ({ isOpen, onClose, cards, defaultLayout, packName }) => {
  const [includeBackside, setIncludeBackside] = useState(true);
  const [cardsPerFile, setCardsPerFile] = useState(18);
  const [isGenerating, setIsGenerating] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState(0);
  const [fileCount, setFileCount] = useState(null);
  const refs = useRef([]);

  if (!isOpen) return null;

  const numFiles = Math.ceil(cards.length / Math.max(1, cardsPerFile));
  const showWarning = cardsPerFile > WARN_THRESHOLD;

  const handleStartExport = async () => {
    setIsGenerating(true);
    setTotal(cards.length);
    setProgress(0);
    setFileCount(null);

    try {
      await generatePdfFromElements({
        elements: refs.current,
        cards,
        includeBackside,
        backsideImgDataUrl: './img/Layout/Backside.png',
        packName,
        cardsPerFile,
        onProgress: (prog, tot, text) => {
          setProgress(prog);
          if (tot) setTotal(tot);
          setStatusText(text);
        },
        onFileCount: (n) => setFileCount(n),
      });
      setIsGenerating(false);
      onClose();
    } catch (err) {
      console.error(err);
      alert('Error generating PDF: ' + err.message);
      setIsGenerating(false);
    }
  };

  return (
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
        ) : (
          <>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.45 }}>
              Generate high-quality, print-ready PDFs with cards at standard <strong>63.5 × 88 mm</strong>. All images are exported as lossless <strong>PNG</strong>.
            </p>

            {/* Summary info */}
            <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-sm)', background: 'var(--bg-main)', border: '1px solid var(--border-color)', fontSize: '0.78rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Paper Size:</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>A4 (Portrait)</span>
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

        {/* Hidden area to render cards for html2canvas */}
        {cards.length > 0 && (
          <div style={{
            position: 'absolute',
            left: '-9999px',
            top: '-9999px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
          }}>
            {cards.map((card, idx) => (
              <CardPreview
                key={card.id || idx}
                ref={el => refs.current[idx] = el}
                card={card}
                defaultLayout={defaultLayout}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ExportPdfModal;
