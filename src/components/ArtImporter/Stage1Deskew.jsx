import React from 'react';
import { ChevronRight, Loader } from 'lucide-react';

const Stage1Deskew = ({
  rawDataUrl,
  deskewedDataUrl,
  runDeskew,
  setStage,
  setRawDataUrl,
  setDeskewedDataUrl,
  setProcessedDataUrl,
  setFinalDataUrl,
  setIsCreateMode
}) => {
  const isDeskewing = !deskewedDataUrl;

  const handleStartOver = () => {
    if (window.confirm('Discard this artwork and start over?')) {
      setRawDataUrl(null);
      setDeskewedDataUrl(null);
      setProcessedDataUrl(null);
      setFinalDataUrl(null);
      setIsCreateMode(false);
      setStage(0);
    }
  };

  const handleSkip = () => {
    setDeskewedDataUrl(rawDataUrl);
    setStage(2);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>
        Auto-detecting paper boundaries and correcting perspective. Check the result below — the art should appear flat and straight.
      </p>

      {isDeskewing ? (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1rem',
          minHeight: '280px',
          background: 'rgba(255,255,255,0.01)',
          border: '1px dashed var(--border-color)',
          borderRadius: 'var(--radius-lg)'
        }}>
          <Loader size={36} className="spin" style={{ color: 'var(--color-primary)' }} />
          <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
            Analyzing paper boundaries with jscanify (OpenCV.js)...
          </span>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
          <div>
            <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.4rem', marginTop: 0 }}>Original</p>
            <img src={rawDataUrl} alt="Original" style={{ width: '100%', borderRadius: '8px', border: '1px solid var(--border-color)' }} />
          </div>
          <div>
            <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-primary)', marginBottom: '0.4rem', marginTop: 0 }}>After Deskew</p>
            <img src={deskewedDataUrl} alt="Deskewed" style={{ width: '100%', borderRadius: '8px', border: '1px solid var(--color-primary)' }} />
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', width: '100%', borderTop: '1px solid var(--border-color)', paddingTop: '1rem', marginTop: '0.5rem' }}>
        <button
          onClick={handleStartOver}
          style={{
            marginRight: 'auto',
            padding: '0.5rem 1rem',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid var(--color-danger)',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '0.85rem',
            color: 'var(--color-danger)'
          }}
        >
          🗑️ Start Over
        </button>
        
        {!isDeskewing && (
          <button
            onClick={runDeskew}
            style={{
              padding: '0.5rem 1rem',
              background: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: 600,
              color: 'var(--text-primary)'
            }}
          >
            🔄 Re-run Auto-Detect
          </button>
        )}

        <button
          onClick={handleSkip}
          disabled={isDeskewing}
          style={{
            padding: '0.5rem 1rem',
            background: 'transparent',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            cursor: isDeskewing ? 'not-allowed' : 'pointer',
            fontSize: '0.85rem',
            color: 'var(--text-muted)',
            opacity: isDeskewing ? 0.5 : 1
          }}
        >
          Skip (use original)
        </button>

        <button
          onClick={() => setStage(2)}
          disabled={isDeskewing}
          style={{
            padding: '0.5rem 1.25rem',
            background: 'var(--color-primary)',
            border: 'none',
            borderRadius: '8px',
            cursor: isDeskewing ? 'not-allowed' : 'pointer',
            fontSize: '0.85rem',
            fontWeight: 700,
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            opacity: isDeskewing ? 0.5 : 1
          }}
        >
          Next: AI Process <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
};

export default Stage1Deskew;
