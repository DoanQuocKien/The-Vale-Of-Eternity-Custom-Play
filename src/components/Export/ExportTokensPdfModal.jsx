import React, { useState } from 'react';
import { X, Download, Plus, Minus, Printer, CheckCircle, Loader } from 'lucide-react';
import { generatePdfForTokens } from '../../utils/pdfUtils.js';

const IS_ELECTRON = typeof window !== 'undefined' && !!window.electronAPI?.convertToCmyk;

const ExportTokensPdfModal = ({ isOpen, onClose, tokens, packName }) => {
  const [baseSize, setBaseSize] = useState(30); // in mm
  const [spacing, setSpacing] = useState(4); // in mm
  const [quantities, setQuantities] = useState(() => {
    const initial = {};
    tokens.forEach(t => {
      initial[t.id] = 5;
    });
    return initial;
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [savedPath, setSavedPath] = useState(null);
  const [cmykStatus, setCmykStatus] = useState(null);
  const [cmykError, setCmykError] = useState('');
  const [cmykOutputPath, setCmykOutputPath] = useState('');

  if (!isOpen) return null;

  const handleStartExport = async () => {
    setIsGenerating(true);
    setStatusText('Preparing tokens...');
    setSavedPath(null);
    setCmykStatus(null);
    setCmykError('');
    setCmykOutputPath('');

    try {
      const path = await generatePdfForTokens({
        tokens,
        quantities,
        baseSize,
        spacing,
        packName,
        onProgress: (text) => setStatusText(text)
      });
      setIsGenerating(false);
      if (IS_ELECTRON && path) {
        setSavedPath(path);
        setStatusText('');
      } else {
        onClose();
      }
    } catch (err) {
      console.error(err);
      alert('Error generating PDF: ' + err.message);
      setIsGenerating(false);
    }
  };

  const handleConvertToCmyk = async () => {
    if (!savedPath) return;
    setCmykStatus('converting');
    setCmykError('');
    const result = await window.electronAPI.convertToCmyk(savedPath);
    if (!result.ok) {
      setCmykStatus('error');
      setCmykError(result.error);
    } else {
      setCmykOutputPath(result.outputPath);
      setCmykStatus('done');
    }
  };

  const handleOpenFolder = (filePath) => {
    if (window.electronAPI?.openPath) window.electronAPI.openPath(filePath);
  };

  const setAllQuantities = (qty) => {
    const updated = {};
    tokens.forEach(t => {
      updated[t.id] = qty;
    });
    setQuantities(updated);
  };

  const updateQuantity = (id, delta) => {
    setQuantities(prev => ({
      ...prev,
      [id]: Math.max(0, (prev[id] || 0) + delta)
    }));
  };

  const handleQuantityChange = (id, val) => {
    const parsed = parseInt(val, 10);
    setQuantities(prev => ({
      ...prev,
      [id]: isNaN(parsed) ? 0 : Math.max(0, parsed)
    }));
  };

  const totalTokensToPrint = Object.values(quantities).reduce((a, b) => a + b, 0);

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
        .token-scroll::-webkit-scrollbar {
          width: 6px;
        }
        .token-scroll::-webkit-scrollbar-track {
          background: rgba(255,255,255,0.02);
          border-radius: 3px;
        }
        .token-scroll::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.12);
          border-radius: 3px;
        }
        .token-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(255,255,255,0.2);
        }
      `}</style>

      <div className="glass-panel animate-fade-in" style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-lg)',
        width: '500px',
        maxHeight: '90vh',
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
            🪙 Export Tokens PDF
          </h3>
          {!isGenerating && (
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
              <X size={20} />
            </button>
          )}
        </div>

        {isGenerating ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '2.5rem 0' }}>
            <div style={{
              width: '40px',
              height: '40px',
              border: '3px solid rgba(124,58,237,0.2)',
              borderTop: '3px solid var(--color-primary)',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }} />
            <span style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 600, textAlign: 'center' }}>
              {statusText}
            </span>
          </div>
        ) : savedPath ? (
          /* ─── Post-export actions panel ─── */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.75rem', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 'var(--radius-sm)' }}>
              <CheckCircle size={18} color="#10b981" />
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: '#10b981' }}>PDF saved to Downloads</p>
                <p style={{ margin: '0.15rem 0 0', fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{savedPath.split(/[/\\]/).pop()}</p>
              </div>
              <button onClick={() => handleOpenFolder(savedPath)} style={{ background: 'none', border: '1px solid rgba(16,185,129,0.4)', borderRadius: 'var(--radius-sm)', padding: '0.25rem 0.5rem', color: '#10b981', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 600, whiteSpace: 'nowrap' }}>Open folder</button>
            </div>
            <div style={{ padding: '0.75rem', background: 'rgba(139,92,246,0.05)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: 'var(--radius-sm)', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                <Printer size={16} color="#a78bfa" style={{ flexShrink: 0, marginTop: '1px' }} />
                <div>
                  <p style={{ margin: 0, fontSize: '0.82rem', fontWeight: 700, color: '#a78bfa' }}>Convert to Print-Safe CMYK</p>
                  <p style={{ margin: '0.2rem 0 0', fontSize: '0.7rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>Uses Ghostscript to convert the exported RGB PDF to CMYK — ideal for professional printing. Requires <strong style={{ color: 'var(--text-secondary)' }}>Ghostscript</strong> to be installed on your system.</p>
                </div>
              </div>
              {(cmykStatus === null || cmykStatus === 'error') && (
                <button onClick={handleConvertToCmyk} style={{ padding: '0.5rem 0.75rem', background: 'linear-gradient(135deg, #7c3aed, #a855f7)', border: 'none', borderRadius: 'var(--radius-sm)', color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', boxShadow: '0 4px 12px rgba(139,92,246,0.25)' }}>
                  {cmykStatus === 'error' ? '🔄 Retry CMYK Conversion' : '🎨 Convert to CMYK'}
                </button>
              )}
              {cmykStatus === 'converting' && (<div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: '#a78bfa' }}><Loader size={14} style={{ animation: 'spin 1s linear infinite' }} />Converting via Ghostscript…</div>)}
              {cmykStatus === 'done' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: '#10b981', fontWeight: 700 }}><CheckCircle size={14} />CMYK conversion complete!</div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.7rem' }}>
                    <span style={{ color: 'var(--text-muted)', fontFamily: 'monospace' }}>{cmykOutputPath.split(/[/\\]/).pop()}</span>
                    <button onClick={() => handleOpenFolder(cmykOutputPath)} style={{ background: 'none', border: '1px solid rgba(16,185,129,0.4)', borderRadius: 'var(--radius-sm)', padding: '0.2rem 0.4rem', color: '#10b981', cursor: 'pointer', fontSize: '0.65rem', fontWeight: 600 }}>Open folder</button>
                  </div>
                </div>
              )}
              {cmykStatus === 'error' && (<div style={{ padding: '0.5rem 0.75rem', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius-sm)', fontSize: '0.72rem', color: '#f87171', lineHeight: 1.45 }}><strong>Conversion failed:</strong><br /><span style={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{cmykError}</span></div>)}
            </div>
            <button onClick={onClose} style={{ padding: '0.55rem', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.85rem' }}>Close</button>
          </div>
        ) : (
          <>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.45 }}>
              Generate a high-quality PDF containing your tokens scaled based on their custom bounding boxes.
            </p>

            {/* Layout Options */}
            <div style={{ display: 'flex', gap: '1rem' }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Base Size: {baseSize}mm</span>
                <input
                  type="range"
                  min="20"
                  max="60"
                  value={baseSize}
                  onChange={(e) => setBaseSize(parseInt(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--color-primary)', cursor: 'pointer' }}
                />
              </div>

              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Spacing: {spacing}mm</span>
                <input
                  type="range"
                  min="2"
                  max="10"
                  value={spacing}
                  onChange={(e) => setSpacing(parseInt(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--color-primary)', cursor: 'pointer' }}
                />
              </div>
            </div>

            {/* Quantity Set All Shortcuts */}
            <div style={{ display: 'flex', alignItems: 'center', justifycontent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Set all quantities:</span>
              <div style={{ display: 'flex', gap: '0.35rem' }}>
                {[0, 1, 3, 5, 10].map(q => (
                  <button
                    key={q}
                    onClick={() => setAllQuantities(q)}
                    style={{
                      padding: '0.2rem 0.5rem',
                      background: 'var(--bg-surface-elevated)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '4px',
                      fontSize: '0.7rem',
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                      fontWeight: 600
                    }}
                  >
                    {q}x
                  </button>
                ))}
              </div>
            </div>

            {/* Token List */}
            <div
              className="token-scroll"
              style={{
                flexGrow: 1,
                overflowY: 'auto',
                maxHeight: '320px',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(0, 0, 0, 0.2)'
              }}
            >
              {tokens.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', padding: '2rem', textAlign: 'center' }}>
                  No tokens in this pack.
                </div>
              ) : (
                tokens.map(tok => {
                  const qty = quantities[tok.id] ?? 5;
                  const thumb = tok.croppedDataUrl || tok.imageDataUrl;
                  return (
                    <div
                      key={tok.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.65rem 0.85rem',
                        borderBottom: '1px solid var(--border-color)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        {thumb ? (
                          <img
                            src={thumb}
                            alt=""
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '4px',
                              objectFit: 'contain',
                              background: 'rgba(255,255,255,0.05)',
                              border: '1px solid rgba(255,255,255,0.1)'
                            }}
                          />
                        ) : (
                          <div style={{ width: '32px', height: '32px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }} />
                        )}
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                          {tok.name}
                        </span>
                      </div>

                      {/* Quantity Controls */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <button
                          onClick={() => updateQuantity(tok.id, -1)}
                          style={{
                            width: '24px',
                            height: '24px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: '4px',
                            background: 'var(--bg-surface-elevated)',
                            border: '1px solid var(--border-color)',
                            color: 'var(--text-secondary)',
                            cursor: 'pointer'
                          }}
                        >
                          <Minus size={12} />
                        </button>
                        <input
                          type="text"
                          value={qty}
                          onChange={(e) => handleQuantityChange(tok.id, e.target.value)}
                          style={{
                            width: '32px',
                            height: '24px',
                            textAlign: 'center',
                            background: 'var(--bg-main)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '4px',
                            color: 'var(--text-primary)',
                            fontSize: '0.75rem',
                            fontWeight: 600
                          }}
                        />
                        <button
                          onClick={() => updateQuantity(tok.id, 1)}
                          style={{
                            width: '24px',
                            height: '24px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: '4px',
                            background: 'var(--bg-surface-elevated)',
                            border: '1px solid var(--border-color)',
                            color: 'var(--text-secondary)',
                            cursor: 'pointer'
                          }}
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* CMYK hint (Electron only) */}
            {IS_ELECTRON && (
              <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: 0, borderTop: '1px solid var(--border-color)', paddingTop: '0.6rem' }}>
                🎨 After exporting, you'll be offered to convert the PDF to print-friendly <strong style={{ color: 'var(--text-secondary)' }}>CMYK</strong> color space via Ghostscript.
              </p>
            )}

            {/* Footer Summary & Buttons */}
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Total copies to print: <strong style={{ color: 'var(--text-primary)' }}>{totalTokensToPrint}</strong>
              </span>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={onClose}
                  style={{
                    padding: '0.45rem 1rem',
                    background: 'transparent',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    fontSize: '0.8rem'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleStartExport}
                  disabled={totalTokensToPrint === 0}
                  style={{
                    padding: '0.45rem 1.25rem',
                    background: totalTokensToPrint > 0 ? 'linear-gradient(135deg, var(--color-primary), #8b5cf6)' : 'var(--bg-surface-elevated)',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    color: totalTokensToPrint > 0 ? 'white' : 'var(--text-muted)',
                    fontWeight: 700,
                    cursor: totalTokensToPrint > 0 ? 'pointer' : 'not-allowed',
                    fontSize: '0.8rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    boxShadow: totalTokensToPrint > 0 ? '0 4px 12px rgba(99, 102, 241, 0.25)' : 'none',
                    transition: 'all 0.15s'
                  }}
                >
                  <Download size={13} />
                  Generate PDF
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ExportTokensPdfModal;
