import React from 'react';
import ColorPickerPanel from './ComponentDesigner.jsx'; // Wait, let's check: ColorPickerPanel is NOT exported from ComponentDesigner.jsx. 
// We can define ColorPickerPanel inside GridLayerEditor.jsx, or keep it self-contained. Let's copy HSL helpers and ColorPickerPanel inline to prevent circular references! That's very safe.

// ─── Inline HSL helpers for Grid Color Pickers ──────────────────────────────
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

function LocalColorPicker({ color, onChange, label }) {
  const [hsl, setHsl] = React.useState({ h: 200, s: 80, l: 50 });
  const [hexInput, setHexInput] = React.useState(color);

  React.useEffect(() => {
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

  const presets = ['#ffffff', '#000000', '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#6366f1', '#ec4899'];

  return (
    <div style={{
      background: 'rgba(255, 255, 255, 0.02)',
      border: '1px solid var(--border-color)',
      borderRadius: 'var(--radius-sm)',
      padding: '0.5rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.4rem',
      marginTop: '0.2rem'
    }}>
      {label && <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)' }}>{label}</span>}
      <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
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
              width: '16px',
              height: '16px',
              background: p,
              border: color.toLowerCase() === p.toLowerCase() ? '2px solid var(--color-primary)' : '1px solid rgba(255,255,255,0.1)',
              borderRadius: '3px',
              cursor: 'pointer',
              padding: 0
            }}
          />
        ))}
      </div>
      <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
        <input
          type="color"
          value={color}
          onChange={(e) => {
            onChange(e.target.value);
            const parsed = hexToHsl(e.target.value);
            setHsl(parsed);
            setHexInput(e.target.value);
          }}
          style={{ width: '24px', height: '24px', padding: 0, border: 'none', background: 'none', cursor: 'pointer' }}
        />
        <input
          type="text"
          value={hexInput}
          onChange={handleHexInputChange}
          placeholder="#ffffff"
          style={{
            flexGrow: 1,
            padding: '0.25rem 0.4rem',
            background: 'var(--bg-main)',
            border: '1px solid var(--border-color)',
            borderRadius: '3px',
            color: 'white',
            fontSize: '0.75rem',
            fontFamily: 'monospace',
            outline: 'none'
          }}
        />
      </div>
    </div>
  );
}

// ─── Main Grid Layer Editor Component ───────────────────────────────────────
export default function GridLayerEditor({ layer, onUpdateLayer }) {
  // Extract state with sensible defaults
  const rows = layer.gridRows ?? 5;
  const cols = layer.gridCols ?? 5;
  const cellSizeMm = layer.cellSizeMm ?? 20;
  const cellGapMm = layer.cellGapMm ?? 2;
  const gridX = layer.gridX ?? 10;
  const gridY = layer.gridY ?? 10;
  const strokeColor = layer.strokeColor ?? '#ffffff';
  const fillColor = layer.fillColor ?? '#6366f1';
  const strokeEnabled = layer.strokeEnabled ?? true;
  const fillEnabled = layer.fillEnabled ?? false;
  const lineWidth = layer.lineWidth ?? 2;
  const showNumbers = layer.showNumbers ?? true;
  
  // Format cellLabels as a single text block (one label per line)
  const cellLabels = layer.cellLabels ?? [];
  const textValue = cellLabels.join('\n');

  const updateField = (key, val) => {
    onUpdateLayer(layer.id, { [key]: val });
  };

  const handleLabelsChange = (e) => {
    const lines = e.target.value.split('\n');
    updateField('cellLabels', lines);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
      <h5 style={{ fontSize: '0.8rem', fontWeight: 800, margin: 0, color: 'var(--text-secondary)' }}>
        Grid Grid Dimensions
      </h5>

      {/* Rows & Columns */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
          <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Rows</label>
          <input
            type="number"
            min="1"
            max="40"
            value={rows}
            onChange={(e) => updateField('gridRows', parseInt(e.target.value) || 1)}
            style={{
              padding: '0.35rem',
              background: 'var(--bg-main)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.75rem',
              color: 'white',
              outline: 'none'
            }}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
          <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Columns</label>
          <input
            type="number"
            min="1"
            max="40"
            value={cols}
            onChange={(e) => updateField('gridCols', parseInt(e.target.value) || 1)}
            style={{
              padding: '0.35rem',
              background: 'var(--bg-main)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.75rem',
              color: 'white',
              outline: 'none'
            }}
          />
        </div>
      </div>

      {/* Cell Size & Gap */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
          <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Cell Size (mm)</label>
          <input
            type="number"
            min="1"
            max="150"
            value={cellSizeMm}
            onChange={(e) => updateField('cellSizeMm', parseFloat(e.target.value) || 1)}
            style={{
              padding: '0.35rem',
              background: 'var(--bg-main)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.75rem',
              color: 'white',
              outline: 'none'
            }}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
          <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Cell Gap (mm)</label>
          <input
            type="number"
            min="0"
            max="50"
            value={cellGapMm}
            onChange={(e) => updateField('cellGapMm', parseFloat(e.target.value) ?? 0)}
            style={{
              padding: '0.35rem',
              background: 'var(--bg-main)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.75rem',
              color: 'white',
              outline: 'none'
            }}
          />
        </div>
      </div>

      {/* Grid Coordinates (Offsets) */}
      <h5 style={{ fontSize: '0.8rem', fontWeight: 800, margin: '0.4rem 0 0 0', color: 'var(--text-secondary)' }}>
        Placement Position (mm)
      </h5>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
          <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Offset X (mm)</label>
          <input
            type="number"
            value={gridX}
            onChange={(e) => updateField('gridX', parseFloat(e.target.value) ?? 0)}
            style={{
              padding: '0.35rem',
              background: 'var(--bg-main)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.75rem',
              color: 'white',
              outline: 'none'
            }}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
          <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Offset Y (mm)</label>
          <input
            type="number"
            value={gridY}
            onChange={(e) => updateField('gridY', parseFloat(e.target.value) ?? 0)}
            style={{
              padding: '0.35rem',
              background: 'var(--bg-main)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.75rem',
              color: 'white',
              outline: 'none'
            }}
          />
        </div>
      </div>

      {/* Style settings */}
      <h5 style={{ fontSize: '0.8rem', fontWeight: 800, margin: '0.4rem 0 0 0', color: 'var(--text-secondary)' }}>
        Grid Styles & Options
      </h5>

      <div style={{ display: 'flex', gap: '1rem' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', cursor: 'pointer', color: 'white' }}>
          <input
            type="checkbox"
            checked={strokeEnabled}
            onChange={(e) => updateField('strokeEnabled', e.target.checked)}
          />
          <span>Border Outline</span>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', cursor: 'pointer', color: 'white' }}>
          <input
            type="checkbox"
            checked={fillEnabled}
            onChange={(e) => updateField('fillEnabled', e.target.checked)}
          />
          <span>Fill Cells</span>
        </label>
      </div>

      <div style={{ display: 'flex', gap: '1rem' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', cursor: 'pointer', color: 'white' }}>
          <input
            type="checkbox"
            checked={showNumbers}
            onChange={(e) => updateField('showNumbers', e.target.checked)}
          />
          <span>Auto Number Cells</span>
        </label>
      </div>

      {strokeEnabled && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'white' }}>
            <span>Border Line Weight</span>
            <span>{lineWidth}px</span>
          </div>
          <input
            type="range"
            min="1"
            max="12"
            value={lineWidth}
            onChange={(e) => updateField('lineWidth', parseInt(e.target.value))}
            style={{ width: '100%' }}
          />
        </div>
      )}

      {strokeEnabled && (
        <LocalColorPicker
          label="Border Color"
          color={strokeColor}
          onChange={(color) => updateField('strokeColor', color)}
        />
      )}

      {fillEnabled && (
        <LocalColorPicker
          label="Cell Background Color"
          color={fillColor}
          onChange={(color) => updateField('fillColor', color)}
        />
      )}

      {/* Labels editor */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginTop: '0.4rem' }}>
        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Cell Text Labels</label>
        <p style={{ fontSize: '0.62rem', color: 'var(--text-muted)', margin: '0 0 0.2rem 0' }}>
          Enter text labels (one per line) to label cells sequentially.
        </p>
        <textarea
          rows="4"
          value={textValue}
          onChange={handleLabelsChange}
          placeholder="HP&#10;Mana&#10;MP&#10;Score"
          style={{
            padding: '0.4rem 0.5rem',
            background: 'var(--bg-main)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.78rem',
            outline: 'none',
            color: 'white',
            fontFamily: 'sans-serif',
            resize: 'vertical'
          }}
        />
      </div>
    </div>
  );
}
