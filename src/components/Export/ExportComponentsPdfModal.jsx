import React, { useState } from 'react';
import { X, Download, Plus, Minus, Printer, Layout, Grid, CheckCircle, Loader } from 'lucide-react';
import { generatePdfForComponents } from '../../utils/pdfUtils.js';

const IS_ELECTRON = typeof window !== 'undefined' && !!window.electronAPI?.convertToCmyk;

const ExportComponentsPdfModal = ({ isOpen, onClose, components, packName }) => {
  const [printType, setPrintType] = useState('centered'); // 'centered' | 'flow'
  const [includeBleed, setIncludeBleed] = useState(true);
  const [includeFolds, setIncludeFolds] = useState(true);
  const [spacing, setSpacing] = useState(4); // in mm, for flow wrapped mode
  const [quantities, setQuantities] = useState(() => {
    const initial = {};
    components.forEach(c => {
      initial[c.id] = 1;
    });
    return initial;
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [progressVal, setProgressVal] = useState(0);
  const [progressTotal, setProgressTotal] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [savedPath, setSavedPath] = useState(null);
  const [cmykStatus, setCmykStatus] = useState(null);
  const [cmykError, setCmykError] = useState('');
  const [cmykOutputPath, setCmykOutputPath] = useState('');

  if (!isOpen) return null;

  const handleStartExport = async () => {
    setIsGenerating(true);
    setStatusText('Preparing components...');
    setProgressVal(0);
    setProgressTotal(0);
    setSavedPath(null);
    setCmykStatus(null);
    setCmykError('');
    setCmykOutputPath('');

    try {
      const path = await generatePdfForComponents({
        components,
        quantities,
        options: {
          printType,
          includeBleed,
          includeFolds,
          spacing
        },
        packName,
        onProgress: (val, total, text) => {
          setProgressVal(val);
          setProgressTotal(total);
          setStatusText(text);
        }
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
    components.forEach(c => {
      updated[c.id] = qty;
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

  const totalToPrint = Object.values(quantities).reduce((a, b) => a + b, 0);

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
        .comp-scroll::-webkit-scrollbar {
          width: 6px;
        }
        .comp-scroll::-webkit-scrollbar-track {
          background: rgba(255,255,255,0.02);
          border-radius: 3px;
        }
        .comp-scroll::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.12);
          border-radius: 3px;
        }
        .comp-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(255,255,255,0.2);
        }
      `}</style>

      <div style={{
        width: '560px',
        maxHeight: '90vh',
        background: '#0f1424',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--border-color)',
          background: 'rgba(255,255,255,0.01)'
        }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f3f4f6' }}>
              <Printer size={18} style={{ color: 'var(--color-primary)' }} />
              Print Components to PDF
            </h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '0.15rem 0 0 0' }}>
              Export custom player boards, resource tracks, or sheet tiles
            </p>
          </div>
          {!isGenerating && (
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-secondary)',
                padding: '0.25rem',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
            >
              <X size={18} />
            </button>
          )}
        </div>

        {isGenerating ? (
          /* Loading / Generating State */
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '4rem 2rem',
            gap: '1.5rem'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              border: '3px solid rgba(99, 102, 241, 0.1)',
              borderTopColor: 'var(--color-primary)',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }} />
            <div style={{ textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: 'white' }}>Generating Print Document</p>
              <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>{statusText}</p>
            </div>
            {progressTotal > 0 && (
              <div style={{ width: '80%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.35rem' }}>
                <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{
                    width: `${(progressVal / progressTotal) * 100}%`,
                    height: '100%',
                    background: 'linear-gradient(to right, #818cf8, #a78bfa)',
                    borderRadius: '3px',
                    transition: 'width 0.2s ease'
                  }} />
                </div>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>
                  {progressVal} / {progressTotal} pages
                </span>
              </div>
            )}
          </div>
        ) : savedPath ? (
          /* ─── Post-export actions panel ─── */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.5rem' }}>
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
              {cmykStatus === null && (
                <button onClick={handleConvertToCmyk} style={{ padding: '0.5rem 0.75rem', background: 'linear-gradient(135deg, #7d3cee, #a856f7)', border: 'none', borderRadius: 'var(--radius-sm)', color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', boxShadow: '0 4px 12px rgba(139,92,246,0.25)' }}>🎨 Convert to CMYK</button>
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
          /* Options & Quantities Form */
          <>
            <div className="comp-scroll" style={{
              padding: '1.5rem',
              overflowY: 'auto',
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem'
            }}>
              {/* Export Mode Choice */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Export Layout Style
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <button
                    onClick={() => setPrintType('centered')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.75rem',
                      background: printType === 'centered' ? 'rgba(99, 102, 241, 0.1)' : 'rgba(255,255,255,0.01)',
                      border: printType === 'centered' ? '1px solid var(--color-primary)' : '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      color: printType === 'centered' ? 'white' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      transition: 'all 0.15s'
                    }}
                  >
                    <Layout size={16} style={{ color: printType === 'centered' ? 'var(--color-primary)' : 'inherit' }} />
                    <div style={{ textAlign: 'left' }}>
                      <div>Centered Physical Page</div>
                      <div style={{ fontSize: '0.65rem', fontWeight: 400, color: 'var(--text-muted)', marginTop: '0.1rem' }}>1 component per page</div>
                    </div>
                  </button>

                  <button
                    onClick={() => setPrintType('flow')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.75rem',
                      background: printType === 'flow' ? 'rgba(167, 139, 250, 0.1)' : 'rgba(255,255,255,0.01)',
                      border: printType === 'flow' ? '1px solid #a78bfa' : '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      color: printType === 'flow' ? 'white' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      transition: 'all 0.15s'
                    }}
                  >
                    <Grid size={16} style={{ color: printType === 'flow' ? '#a78bfa' : 'inherit' }} />
                    <div style={{ textAlign: 'left' }}>
                      <div>Tiled Grid Flow</div>
                      <div style={{ fontSize: '0.65rem', fontWeight: 400, color: 'var(--text-muted)', marginTop: '0.1rem' }}>Wrap multiple on A4</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Rendering Options */}
              <div style={{
                background: 'rgba(255,255,255,0.01)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                padding: '0.85rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem'
              }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Overlay Guides
                </span>
                <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', cursor: 'pointer', color: 'white' }}>
                    <input
                      type="checkbox"
                      checked={includeBleed}
                      onChange={(e) => setIncludeBleed(e.target.checked)}
                    />
                    <span>Draw Bleed Border Line</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', cursor: 'pointer', color: 'white' }}>
                    <input
                      type="checkbox"
                      checked={includeFolds}
                      onChange={(e) => setIncludeFolds(e.target.checked)}
                    />
                    <span>Draw Fold Guidelines</span>
                  </label>
                </div>

                {printType === 'flow' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', marginTop: '0.25rem' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Tile spacing gap:</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <input
                        type="number"
                        value={spacing}
                        onChange={(e) => setSpacing(Math.max(0, parseInt(e.target.value) || 0))}
                        style={{
                          width: '50px',
                          padding: '0.2rem 0.4rem',
                          background: 'var(--bg-main)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          textAlign: 'center'
                        }}
                        min="0"
                        max="20"
                      />
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>mm</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Quantities Form List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Set Print Quantities
                  </label>
                  <div style={{ display: 'flex', gap: '0.35rem' }}>
                    <button
                      onClick={() => setAllQuantities(1)}
                      style={{ border: 'none', background: 'rgba(255,255,255,0.03)', padding: '0.15rem 0.35rem', borderRadius: '3px', fontSize: '0.62rem', color: 'var(--text-secondary)', cursor: 'pointer' }}
                    >
                      All 1
                    </button>
                    <button
                      onClick={() => setAllQuantities(0)}
                      style={{ border: 'none', background: 'rgba(255,255,255,0.03)', padding: '0.15rem 0.35rem', borderRadius: '3px', fontSize: '0.62rem', color: 'var(--text-secondary)', cursor: 'pointer' }}
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                  maxHeight: '220px',
                  overflowY: 'auto',
                  background: 'rgba(0,0,0,0.15)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.5rem'
                }} className="comp-scroll">
                  {components.map(comp => (
                    <div
                      key={comp.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.4rem 0.5rem',
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid rgba(255,255,255,0.03)',
                        borderRadius: 'var(--radius-sm)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        {comp.canvasData ? (
                          <img
                            src={comp.canvasData}
                            alt=""
                            style={{
                              width: '32px',
                              height: '24px',
                              objectFit: 'contain',
                              background: '#070a13',
                              border: '1px solid rgba(255,255,255,0.1)',
                              borderRadius: '3px'
                            }}
                          />
                        ) : (
                          <div style={{ width: '32px', height: '24px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px' }} />
                        )}
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'white' }}>{comp.name}</span>
                          <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>
                            {comp.type.toUpperCase()} • {comp.widthMm}x{comp.heightMm} mm
                          </span>
                        </div>
                      </div>

                      {/* Quantity Toggles */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                        <button
                          onClick={() => updateQuantity(comp.id, -1)}
                          style={{
                            background: 'rgba(255,255,255,0.05)',
                            border: 'none',
                            color: 'white',
                            width: '20px',
                            height: '20px',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer'
                          }}
                        >
                          <Minus size={10} />
                        </button>
                        <input
                          type="text"
                          value={quantities[comp.id] ?? 0}
                          onChange={(e) => handleQuantityChange(comp.id, e.target.value)}
                          style={{
                            width: '32px',
                            border: 'none',
                            background: 'transparent',
                            textAlign: 'center',
                            color: 'white',
                            fontSize: '0.8rem',
                            fontWeight: 700
                          }}
                        />
                        <button
                          onClick={() => updateQuantity(comp.id, 1)}
                          style={{
                            background: 'rgba(255,255,255,0.05)',
                            border: 'none',
                            color: 'white',
                            width: '20px',
                            height: '20px',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer'
                          }}
                        >
                          <Plus size={10} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* CMYK hint (Electron only) */}
            {IS_ELECTRON && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', borderTop: '1px solid var(--border-color)', padding: '0.75rem 1.5rem', background: 'rgba(255,255,255,0.005)' }}>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: 0 }}>
                  🎨 After exporting, you'll be offered to convert the PDF to print-friendly <strong style={{ color: 'var(--text-secondary)' }}>CMYK</strong> color space via Ghostscript.
                </p>
              </div>
            )}

            {/* Footer */}
            <div style={{
              padding: '1rem 1.5rem',
              borderTop: '1px solid var(--border-color)',
              background: 'rgba(255,255,255,0.01)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                Total to export: <strong>{totalToPrint} components</strong>
              </span>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={onClose}
                  className="btn"
                  style={{
                    padding: '0.4rem 0.8rem',
                    fontSize: '0.75rem',
                    background: 'transparent',
                    border: '1px solid var(--border-color)'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleStartExport}
                  disabled={totalToPrint === 0}
                  className="btn"
                  style={{
                    padding: '0.4rem 1rem',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    background: printType === 'centered' ? 'var(--color-primary)' : '#a78bfa',
                    border: 'none',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    opacity: totalToPrint === 0 ? 0.4 : 1,
                    cursor: totalToPrint === 0 ? 'not-allowed' : 'pointer'
                  }}
                >
                  <Download size={13} />
                  <span>Generate PDF</span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ExportComponentsPdfModal;
