import React, { useState, useEffect } from 'react';

// ─── Color Picker Helpers ─────────────────────────────────────────────
function hexToHsl(hex) {
  hex = hex.replace(/^#/, '');
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }
  let r = parseInt(hex.substring(0, 2), 16) / 255;
  let g = parseInt(hex.substring(2, 4), 16) / 255;
  let b = parseInt(hex.substring(4, 6), 16) / 255;

  let max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;

  if (max === min) {
    h = s = 0;
  } else {
    let d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100)
  };
}

function hslToHex(h, s, l) {
  s /= 100;
  l /= 100;
  let c = (1 - Math.abs(2 * l - 1)) * s;
  let x = c * (1 - Math.abs((h / 60) % 2 - 1));
  let m = l - c / 2;
  let r = 0, g = 0, b = 0;

  if (0 <= h && h < 60) {
    r = c; g = x; b = 0;
  } else if (60 <= h && h < 120) {
    r = x; g = c; b = 0;
  } else if (120 <= h && h < 180) {
    r = 0; g = c; b = x;
  } else if (180 <= h && h < 240) {
    r = 0; g = x; b = c;
  } else if (240 <= h && h < 300) {
    r = x; g = 0; b = c;
  } else if (300 <= h && h <= 360) {
    r = c; g = 0; b = x;
  }

  let rHex = Math.round((r + m) * 255).toString(16).padStart(2, '0');
  let gHex = Math.round((g + m) * 255).toString(16).padStart(2, '0');
  let bHex = Math.round((b + m) * 255).toString(16).padStart(2, '0');

  return `#${rHex}${gHex}${bHex}`;
}

const colorPickerStyles = `
  .custom-color-slider {
    -webkit-appearance: none;
    appearance: none;
    width: 100%;
    height: 8px;
    border-radius: 4px;
    outline: none;
    margin: 6px 0;
    cursor: pointer;
  }
  .custom-color-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #ffffff;
    border: 2px solid var(--color-primary, #6366f1);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.4);
    cursor: pointer;
    transition: transform 0.1s;
  }
  .custom-color-slider::-webkit-slider-thumb:hover {
    transform: scale(1.15);
  }
  .custom-color-slider::-moz-range-thumb {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #ffffff;
    border: 2px solid var(--color-primary, #6366f1);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.4);
    cursor: pointer;
    transition: transform 0.1s;
  }
  .custom-color-slider::-moz-range-thumb:hover {
    transform: scale(1.15);
  }
`;

export default function ColorPickerPanel({ color, onChange, label }) {
  const [hsl, setHsl] = useState({ h: 200, s: 80, l: 50 });
  const [hexInput, setHexInput] = useState(color);

  useEffect(() => {
    if (color && color.startsWith('#')) {
      const parsed = hexToHsl(color);
      setHsl(parsed);
      setHexInput(color);
    }
  }, [color]);

  const handleHslChange = (h, s, l) => {
    setHsl({ h, s, l });
    const hex = hslToHex(h, s, l);
    setHexInput(hex);
    onChange(hex);
  };

  const handleHexInputChange = (e) => {
    const val = e.target.value;
    setHexInput(val);
    if (/^#[0-9A-F]{6}$/i.test(val) || /^#[0-9A-F]{3}$/i.test(val)) {
      onChange(val);
      const parsed = hexToHsl(val);
      setHsl(parsed);
    }
  };

  const presets = ['#ffffff', '#000000', '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#6366f1', '#ec4899', '#a78bfa', '#f472b6'];

  return (
    <div style={{
      background: 'rgba(255, 255, 255, 0.03)',
      border: '1px solid var(--border-color)',
      borderRadius: 'var(--radius-md)',
      padding: '0.75rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.6rem',
      marginTop: '0.25rem'
    }}>
      <style>{colorPickerStyles}</style>
      {label && <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)' }}>{label}</span>}
      
      {/* Preset Swatches */}
      <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
        {presets.map(p => (
          <button
            key={p}
            onClick={() => {
              onChange(p);
              const parsed = hexToHsl(p);
              setHsl(parsed);
              setHexInput(p);
            }}
            style={{
              width: '18px',
              height: '18px',
              background: p,
              border: color.toLowerCase() === p.toLowerCase() ? '2px solid var(--color-primary)' : '1px solid rgba(255,255,255,0.1)',
              borderRadius: '4px',
              cursor: 'pointer',
              padding: 0
            }}
            title={p}
          />
        ))}
      </div>

      {/* Interactive Sliders */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        {/* Hue Slider */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
            <span>Hue</span>
            <span>{hsl.h}°</span>
          </div>
          <input
            type="range"
            min="0"
            max="360"
            value={hsl.h}
            onChange={(e) => handleHslChange(parseInt(e.target.value), hsl.s, hsl.l)}
            className="custom-color-slider"
            style={{
              background: 'linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)',
            }}
          />
        </div>

        {/* Saturation Slider */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
            <span>Saturation</span>
            <span>{hsl.s}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={hsl.s}
            onChange={(e) => handleHslChange(hsl.h, parseInt(e.target.value), hsl.l)}
            className="custom-color-slider"
            style={{
              background: `linear-gradient(to right, hsl(${hsl.h}, 0%, 50%), hsl(${hsl.h}, 100%, 50%))`,
            }}
          />
        </div>

        {/* Lightness Slider */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
            <span>Lightness</span>
            <span>{hsl.l}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={hsl.l}
            onChange={(e) => handleHslChange(hsl.h, hsl.s, parseInt(e.target.value))}
            className="custom-color-slider"
            style={{
              background: `linear-gradient(to right, #000000, hsl(${hsl.h}, 100%, 50%), #ffffff)`,
            }}
          />
        </div>
      </div>

      {/* Hex Text Input & Color Preview Box */}
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.2rem' }}>
        <div style={{
          position: 'relative',
          width: '32px',
          height: '32px',
          borderRadius: '6px',
          background: color,
          border: '1px solid var(--border-color)',
          boxShadow: 'inset 0 0 4px rgba(0,0,0,0.2)',
          cursor: 'pointer',
          overflow: 'hidden'
        }} title="Click to open full color picker">
          <input
            type="color"
            value={color}
            onChange={(e) => {
              onChange(e.target.value);
              const parsed = hexToHsl(e.target.value);
              setHsl(parsed);
              setHexInput(e.target.value);
            }}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              opacity: 0,
              cursor: 'pointer'
            }}
          />
        </div>
        <input
          type="text"
          value={hexInput}
          onChange={handleHexInputChange}
          placeholder="#ffffff"
          style={{
            flexGrow: 1,
            padding: '0.4rem 0.6rem',
            background: 'var(--bg-main)',
            border: '1px solid var(--border-color)',
            borderRadius: '4px',
            color: 'white',
            fontSize: '0.8rem',
            fontFamily: 'monospace',
            outline: 'none'
          }}
        />
      </div>
    </div>
  );
}
