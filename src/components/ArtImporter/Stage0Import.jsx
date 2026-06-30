import React from 'react';
import { Upload, Camera, X } from 'lucide-react';

const Stage0Import = ({
  showWebcam,
  setShowWebcam,
  videoRef,
  fileInputRef,
  handleFileUpload,
  handleDrop,
  startWebcam,
  captureWebcam,
  webcamStream,
  createBlankCanvas,
  onClose,
  isTokenMode,
  isComponentMode
}) => {
  const isCustomMode = isTokenMode || isComponentMode;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {!showWebcam ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '1.5rem', minHeight: '320px' }}>
          {/* Left: Drag & Drop Upload Zone */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: '2px dashed var(--border-color)',
              borderRadius: 'var(--radius-lg)',
              background: 'rgba(255, 255, 255, 0.01)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '1rem',
              cursor: 'pointer',
              transition: 'all 0.2s',
              padding: '2rem'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-primary)';
              e.currentTarget.style.background = 'rgba(99, 102, 241, 0.02)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-color)';
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.01)';
            }}
          >
            <Upload size={48} style={{ color: 'var(--text-muted)' }} />
            <div style={{ textAlign: 'center' }}>
              <p style={{ margin: '0 0 0.25rem 0', fontWeight: 700, fontSize: '0.95rem', color: 'white' }}>
                Drag & Drop Image
              </p>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Supports PNG, JPEG, WEBP up to 10MB
              </p>
            </div>
            <button
              className="btn btn-primary"
              style={{ padding: '0.45rem 1.2rem', fontSize: '0.8rem', pointerEvents: 'none' }}
            >
              Browse Files
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="image/*"
              style={{ display: 'none' }}
            />
          </div>

          {/* Right: Alternate Methods */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', justifyContent: 'center' }}>
            {/* Webcam Button */}
            <button
              onClick={startWebcam}
              style={{
                padding: '1.5rem',
                borderRadius: 'var(--radius-lg)',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--border-color)',
                color: 'white',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.6rem',
                transition: 'all 0.15s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
            >
              <Camera size={30} style={{ color: 'var(--color-primary)' }} />
              <div style={{ textAlign: 'center' }}>
                <span style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700 }}>Scan Artwork</span>
                <span style={{ display: 'block', fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                  Use camera or webcam
                </span>
              </div>
            </button>

            {/* Draw from Scratch */}
            <button
              onClick={createBlankCanvas}
              style={{
                padding: '1.5rem',
                borderRadius: 'var(--radius-lg)',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--border-color)',
                color: 'white',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.6rem',
                transition: 'all 0.15s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
            >
              <span style={{ fontSize: '1.8rem', lineHeight: 1 }}>🎨</span>
              <div style={{ textAlign: 'center' }}>
                <span style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700 }}>Draw from Scratch</span>
                <span style={{ display: 'block', fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                  Open a blank canvas ({isCustomMode ? 'custom size' : '1728×2414 px'})
                </span>
              </div>
            </button>

            {/* Cancel Button */}
            <button
              onClick={onClose}
              style={{
                padding: '0.6rem',
                borderRadius: 'var(--radius-md)',
                background: 'transparent',
                border: '1px solid var(--border-color)',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontWeight: 600
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        /* Webcam Capture Screen */
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: '100%',
            height: '380px',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
            background: 'black',
            border: '1px solid var(--border-color)',
            position: 'relative'
          }}>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            {/* Capture overlay target */}
            <div style={{
              position: 'absolute',
              inset: '2rem',
              border: '2px dashed rgba(255,255,255,0.4)',
              borderRadius: '8px',
              pointerEvents: 'none'
            }} />
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', width: '100%', maxWidth: '360px' }}>
            <button
              onClick={() => {
                webcamStream?.getTracks().forEach(t => t.stop());
                setShowWebcam(false);
              }}
              style={{
                flex: 1,
                padding: '0.6rem',
                background: 'transparent',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontWeight: 600
              }}
            >
              Back
            </button>
            <button
              onClick={captureWebcam}
              style={{
                flex: 2,
                padding: '0.6rem',
                background: 'var(--color-primary)',
                border: 'none',
                borderRadius: '8px',
                color: 'white',
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontWeight: 700,
                boxShadow: '0 4px 12px rgba(99,102,241,0.3)'
              }}
            >
              📸 Capture Artwork
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Stage0Import;
