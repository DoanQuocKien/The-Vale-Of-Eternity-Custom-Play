import React from 'react';
import { Loader, ChevronRight } from 'lucide-react';

const Stage2Enhance = ({
  processing,
  progressSteps,
  setProgressSteps,
  runProcessingPipeline,
  setStage,
  setRawDataUrl,
  setDeskewedDataUrl,
  setProcessedDataUrl,
  setFinalDataUrl,
  setIsCreateMode
}) => {
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>
        Configure and run the AI pipeline. Toggle steps on/off to customize the process.
      </p>

      {/* Step toggles */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {progressSteps.map((step, idx) => (
          <div
            key={idx}
            style={{
              padding: '0.85rem 1rem',
              borderRadius: '10px',
              border: `1px solid ${step.active ? 'var(--color-primary)' : step.done ? 'var(--color-success)' : 'var(--border-color)'}`,
              background: step.active ? 'rgba(99,102,241,0.08)' : step.done ? 'rgba(16,185,129,0.06)' : 'var(--bg-surface-elevated)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              transition: 'all 0.3s'
            }}
          >
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                flexShrink: 0,
                background: step.done ? 'var(--color-success)' : step.active ? 'var(--color-primary)' : 'var(--bg-main)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: `2px solid ${step.done ? 'var(--color-success)' : step.active ? 'var(--color-primary)' : 'var(--border-color)'}`,
                fontSize: '0.75rem',
                fontWeight: 800,
                color: (step.done || step.active) ? 'white' : 'var(--text-muted)'
              }}
            >
              {step.done ? '✓' : step.active ? <Loader size={13} className="spin" /> : idx + 1}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span
                  style={{
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    color: step.skip ? 'var(--text-muted)' : 'var(--text-primary)',
                    textDecoration: step.skip ? 'line-through' : 'none'
                  }}
                >
                  {step.label}
                </span>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--text-muted)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={!step.skip}
                    disabled={processing}
                    onChange={(e) => setProgressSteps(prev => prev.map((s, i) => i === idx ? { ...s, skip: !e.target.checked } : s))}
                  />
                  Enable
                </label>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', width: '100%', borderTop: '1px solid var(--border-color)', paddingTop: '1rem', marginTop: '0.5rem' }}>
        <button
          onClick={handleStartOver}
          disabled={processing}
          style={{
            marginRight: 'auto',
            padding: '0.5rem 1rem',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid var(--color-danger)',
            borderRadius: '8px',
            cursor: processing ? 'not-allowed' : 'pointer',
            fontSize: '0.85rem',
            color: 'var(--color-danger)',
            opacity: processing ? 0.5 : 1
          }}
        >
          🗑️ Start Over
        </button>

        <button
          onClick={() => setStage(1)}
          disabled={processing}
          style={{
            padding: '0.5rem 1rem',
            background: 'transparent',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            cursor: processing ? 'not-allowed' : 'pointer',
            fontSize: '0.85rem',
            color: 'var(--text-muted)',
            opacity: processing ? 0.5 : 1
          }}
        >
          ← Back
        </button>

        <button
          onClick={runProcessingPipeline}
          disabled={processing}
          style={{
            padding: '0.5rem 1.5rem',
            background: 'var(--color-primary)',
            border: 'none',
            borderRadius: '8px',
            cursor: processing ? 'not-allowed' : 'pointer',
            fontSize: '0.85rem',
            fontWeight: 700,
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            boxShadow: '0 4px 12px rgba(99,102,241,0.25)',
            opacity: processing ? 0.5 : 1
          }}
        >
          {processing ? (
            <>
              <Loader size={14} className="spin" /> Processing...
            </>
          ) : (
            <>
              Run AI Pipeline <ChevronRight size={16} />
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default Stage2Enhance;
