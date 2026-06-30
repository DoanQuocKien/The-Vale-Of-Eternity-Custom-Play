import React from 'react';
import { Trash2, Plus, FileText, Undo, RotateCcw, Square, Circle as CircleIcon, Type, Paintbrush, Eraser, Check, Settings, Minus, FileImage, Sliders } from 'lucide-react';
import LayerPanel from './LayerPanel.jsx';
import GridLayerEditor from './GridLayerEditor.jsx';
import ColorPickerPanel from '../ArtImporter/ColorPickerPanel.jsx';
import LibraryDrawer from './LibraryDrawer.jsx';

const PropertySidebar = ({
  activeComponent,
  activeLayer,
  activeLayerId,
  setActiveLayerId,
  handleUpdateLayer,
  showLibraryPicker,
  setShowLibraryPicker,
  openLibraryPicker,
  onShowArtImporter,
  tool,
  setTool,
  strokeColor,
  setStrokeColor,
  fillColor,
  setFillColor,
  strokeEnabled,
  setStrokeEnabled,
  fillEnabled,
  setFillEnabled,
  brushSize,
  setBrushSize,
  brushOpacity,
  setBrushOpacity,
  fontSize,
  setFontSize,
  textString,
  setTextString,
  fontWeight,
  setFontWeight,
  imageFileInputRef,
  handleImageFileUpload,
  onPickLibraryItem,
  onRenderAndPickCard,
  libraryLoading,
  // Layer list operations
  handleAddNewLayer,
  handleDeleteLayer,
  handleToggleLayerVisibility,
  handleDuplicateLayer,
  handleMoveLayer
}) => {
  return (
    <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {showLibraryPicker ? (
        <LibraryDrawer
          onCancel={() => setShowLibraryPicker(false)}
          onPickItem={onPickLibraryItem}
          onRenderCard={onRenderAndPickCard}
        />
      ) : activeLayer ? (
        <>
          {/* 1. TEXT LAYER EDITORS */}
          {activeLayer.type === 'text' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <h5 style={{ fontSize: '0.8rem', fontWeight: 800, margin: 0, color: 'var(--text-secondary)' }}>
                Text Label Options
              </h5>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Text Content</label>
                <input
                  type="text"
                  value={activeLayer.text || ''}
                  onChange={(e) => handleUpdateLayer(activeLayer.id, { text: e.target.value })}
                  style={{
                    padding: '0.35rem 0.5rem',
                    background: 'var(--bg-main)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.8rem',
                    color: 'white',
                    outline: 'none'
                  }}
                />
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Font Style</label>
                <select
                  value={activeLayer.fontFamily || 'NorseBold'}
                  onChange={(e) => handleUpdateLayer(activeLayer.id, { fontFamily: e.target.value })}
                  style={{
                    padding: '0.35rem',
                    background: 'var(--bg-main)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.75rem',
                    color: 'white',
                    outline: 'none'
                  }}
                >
                  <option value="NorseBold">NorseBold (Norse Game Header)</option>
                  <option value="TitanOne">TitanOne (Heavy Accent)</option>
                  <option value="MerriweatherSans">MerriweatherSans (Body Bold)</option>
                  <option value="sans-serif">Standard System Font</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'white' }}>
                  <span>Font Size</span>
                  <span>{activeLayer.fontSize ?? 48}px</span>
                </div>
                <input
                  type="range"
                  min="12"
                  max="300"
                  value={activeLayer.fontSize ?? 48}
                  onChange={(e) => handleUpdateLayer(activeLayer.id, { fontSize: parseInt(e.target.value) })}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'white' }}>
                  <span>Position X (mm)</span>
                  <span>{activeLayer.textX ?? Math.round(activeComponent.widthMm / 2)} mm</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max={activeComponent.widthMm}
                  step="1"
                  value={activeLayer.textX ?? Math.round(activeComponent.widthMm / 2)}
                  onChange={(e) => handleUpdateLayer(activeLayer.id, { textX: parseInt(e.target.value) })}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'white' }}>
                  <span>Position Y (mm)</span>
                  <span>{activeLayer.textY ?? Math.round(activeComponent.heightMm / 2)} mm</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max={activeComponent.heightMm}
                  step="1"
                  value={activeLayer.textY ?? Math.round(activeComponent.heightMm / 2)}
                  onChange={(e) => handleUpdateLayer(activeLayer.id, { textY: parseInt(e.target.value) })}
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', padding: '0.25rem 0' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', cursor: 'pointer', color: 'white' }}>
                  <input
                    type="checkbox"
                    checked={activeLayer.fillEnabled ?? true}
                    onChange={(e) => handleUpdateLayer(activeLayer.id, { fillEnabled: e.target.checked })}
                  />
                  <span>Draw Color Fill</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', cursor: 'pointer', color: 'white' }}>
                  <input
                    type="checkbox"
                    checked={activeLayer.strokeEnabled ?? false}
                    onChange={(e) => handleUpdateLayer(activeLayer.id, { strokeEnabled: e.target.checked })}
                  />
                  <span>Stroke Border Outline</span>
                </label>
              </div>

              {(activeLayer.fillEnabled ?? true) && (
                <ColorPickerPanel
                  label="Text Fill Color"
                  color={activeLayer.fillColor || '#ffffff'}
                  onChange={(color) => handleUpdateLayer(activeLayer.id, { fillColor: color })}
                />
              )}

              {activeLayer.strokeEnabled && (
                <>
                  <ColorPickerPanel
                    label="Text Stroke Color"
                    color={activeLayer.strokeColor || '#000000'}
                    onChange={(color) => handleUpdateLayer(activeLayer.id, { strokeColor: color })}
                  />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'white' }}>
                      <span>Outline Thickness</span>
                      <span>{activeLayer.lineWidth ?? 2}px</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="12"
                      value={activeLayer.lineWidth ?? 2}
                      onChange={(e) => handleUpdateLayer(activeLayer.id, { lineWidth: parseInt(e.target.value) })}
                    />
                  </div>
                </>
              )}
            </div>
          )}

          {/* 2. FILL LAYER EDITORS */}
          {activeLayer.type === 'fill' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <h5 style={{ fontSize: '0.8rem', fontWeight: 800, margin: 0, color: 'var(--text-secondary)' }}>
                Background Solid Fill Color
              </h5>
              <ColorPickerPanel
                label="Solid Fill Color"
                color={activeLayer.fillColor || '#3b82f6'}
                onChange={(color) => handleUpdateLayer(activeLayer.id, { fillColor: color })}
              />
            </div>
          )}

          {/* 3. IMAGE LAYER EDITORS */}
          {activeLayer.type === 'image' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <h5 style={{ fontSize: '0.8rem', fontWeight: 800, margin: 0, color: 'var(--text-secondary)' }}>
                Image Layer Properties
              </h5>
              
              {!activeLayer.imageDataUrl ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: 0 }}>Choose how to add an image to this layer:</p>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {/* Option 1: Full Art Importer Pipeline */}
                    <button
                      onClick={() => {
                        if (typeof onShowArtImporter === 'function') {
                          onShowArtImporter({
                            family: 'Water',
                            existingArt: null,
                            isComponentMode: true
                          }, (artData) => {
                            handleUpdateLayer(activeLayer.id, {
                              imageDataUrl: artData.dataUrl,
                              scale: 1, rotation: 0, transformX: 0, transformY: 0
                            });
                          });
                        }
                      }}
                      className="btn"
                      style={{
                        flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                        justifyContent: 'center', padding: '1rem 0.4rem',
                        background: 'rgba(99,102,241,0.06)', border: '1px dashed var(--color-primary)',
                        borderRadius: 'var(--radius-md)', cursor: 'pointer', gap: '0.35rem'
                      }}
                    >
                      <FileImage size={18} style={{ color: 'var(--color-primary)' }} />
                      <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-primary)' }}>Art Pipeline</span>
                      <span style={{ fontSize: '0.58rem', color: 'var(--text-muted)' }}>Enhance &amp; place</span>
                    </button>

                    {/* Option 2: Direct upload */}
                    <button
                      onClick={() => imageFileInputRef.current?.click()}
                      className="btn"
                      style={{
                        flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                        justifyContent: 'center', padding: '1rem 0.4rem',
                        background: 'rgba(16,185,129,0.06)', border: '1px dashed #10b981',
                        borderRadius: 'var(--radius-md)', cursor: 'pointer', gap: '0.35rem'
                      }}
                    >
                      <Plus size={18} style={{ color: '#10b981' }} />
                      <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-primary)' }}>Upload</span>
                      <span style={{ fontSize: '0.58rem', color: 'var(--text-muted)' }}>Raw image</span>
                    </button>

                    {/* Option 3: From Library */}
                    <button
                      onClick={() => openLibraryPicker(activeLayer.id)}
                      className="btn"
                      style={{
                        flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                        justifyContent: 'center', padding: '1rem 0.4rem',
                        background: 'rgba(245,158,11,0.06)', border: '1px dashed #f59e0b',
                        borderRadius: 'var(--radius-md)', cursor: 'pointer', gap: '0.35rem'
                      }}
                    >
                      <Sliders size={18} style={{ color: '#f59e0b' }} />
                      <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-primary)' }}>Library</span>
                      <span style={{ fontSize: '0.58rem', color: 'var(--text-muted)' }}>Tokens &amp; icons</span>
                    </button>
                  </div>

                  <input
                    ref={imageFileInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={(e) => handleImageFileUpload(e, activeLayer.id)}
                  />
                </div>

              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => {
                        if (typeof onShowArtImporter === 'function') {
                          onShowArtImporter({
                            family: 'Water',
                            existingArt: activeLayer.imageDataUrl,
                            isComponentMode: true
                          }, (artData) => {
                            handleUpdateLayer(activeLayer.id, {
                              imageDataUrl: artData.dataUrl,
                              scale: 1,
                              rotation: 0,
                              transformX: 0,
                              transformY: 0
                            });
                          });
                        }
                      }}
                      className="btn"
                      style={{
                        flex: 1,
                        padding: '0.4rem',
                        fontSize: '0.7rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.25rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        minWidth: '70px'
                      }}
                    >
                      <FileImage size={11} /> Pipeline
                    </button>
                    <button
                      onClick={() => openLibraryPicker(activeLayer.id)}
                      className="btn"
                      style={{
                        flex: 1,
                        padding: '0.4rem',
                        fontSize: '0.7rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.25rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        minWidth: '70px'
                      }}
                    >
                      <Sliders size={11} style={{ color: '#f59e0b' }} /> Library
                    </button>
                    <button
                      onClick={() => handleUpdateLayer(activeLayer.id, { imageDataUrl: null })}
                      className="btn-danger"
                      style={{
                        flex: 1,
                        padding: '0.4rem',
                        fontSize: '0.7rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.25rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        minWidth: '70px'
                      }}
                    >
                      <Trash2 size={11} /> Remove
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'white' }}>
                      <span>Scale factor</span>
                      <span>{Math.round((activeLayer.scale ?? 1) * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.05"
                      max="4"
                      step="0.05"
                      value={activeLayer.scale ?? 1}
                      onChange={(e) => handleUpdateLayer(activeLayer.id, { scale: parseFloat(e.target.value) })}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'white' }}>
                      <span>Rotation Degrees</span>
                      <span>{activeLayer.rotation ?? 0}°</span>
                    </div>
                    <input
                      type="range"
                      min="-180"
                      max="180"
                      value={activeLayer.rotation ?? 0}
                      onChange={(e) => handleUpdateLayer(activeLayer.id, { rotation: parseInt(e.target.value) })}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'white' }}>
                      <span>Position X offset (mm)</span>
                      <span>{activeLayer.transformX ?? 0} mm</span>
                    </div>
                    <input
                      type="range"
                      min="-300"
                      max="300"
                      value={activeLayer.transformX ?? 0}
                      onChange={(e) => handleUpdateLayer(activeLayer.id, { transformX: parseInt(e.target.value) })}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'white' }}>
                      <span>Position Y offset (mm)</span>
                      <span>{activeLayer.transformY ?? 0} mm</span>
                    </div>
                    <input
                      type="range"
                      min="-300"
                      max="300"
                      value={activeLayer.transformY ?? 0}
                      onChange={(e) => handleUpdateLayer(activeLayer.id, { transformY: parseInt(e.target.value) })}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 4. GRID BUILDER EDITORS */}
          {activeLayer.type === 'grid' && (
            <GridLayerEditor
              layer={activeLayer}
              onUpdateLayer={handleUpdateLayer}
            />
          )}

          {/* 5. DRAWING LAYER EDITORS */}
          {activeLayer.type === 'drawing' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Choose Tool</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.35rem' }}>
                  {[
                    { id: 'brush', icon: <Paintbrush size={14} />, label: 'Brush' },
                    { id: 'erase', icon: <Eraser size={14} />, label: 'Eraser' },
                    { id: 'line', icon: <Minus size={14} style={{ transform: 'rotate(-45deg)' }} />, label: 'Line' },
                    { id: 'rect', icon: <Square size={14} />, label: 'Rect' },
                    { id: 'circle', icon: <CircleIcon size={14} />, label: 'Circle' },
                    { id: 'text', icon: <Type size={14} />, label: 'Text' },
                    { id: 'none', icon: <Move size={14} />, label: 'Pan/View' }
                  ].map(t => (
                    <button
                      key={t.id}
                      onClick={() => setTool(t.id)}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '0.25rem',
                        padding: '0.4rem 0.2rem',
                        background: tool === t.id ? 'var(--color-primary)' : 'var(--bg-main)',
                        border: tool === t.id ? '1px solid var(--color-primary)' : '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-sm)',
                        color: tool === t.id ? 'white' : 'var(--text-secondary)',
                        cursor: 'pointer',
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        transition: 'all 0.15s'
                      }}
                    >
                      {t.icon}
                      <span>{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {tool === 'text' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '0.75rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
                  <label style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Text String</label>
                  <input
                    type="text"
                    value={textString}
                    onChange={(e) => setTextString(e.target.value)}
                    style={{
                      padding: '0.35rem 0.5rem',
                      background: 'var(--bg-main)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.8rem',
                      outline: 'none',
                      color: 'white'
                    }}
                  />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', marginTop: '0.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'white' }}>
                      <span>Font Size</span>
                      <span>{fontSize}px</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="200"
                      value={fontSize}
                      onChange={(e) => setFontSize(parseInt(e.target.value))}
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'white' }}>
                      <span>Font Weight</span>
                      <span style={{ fontWeight: fontWeight }}>{fontWeight}</span>
                    </div>
                    <input
                      type="range"
                      min="100"
                      max="900"
                      step="100"
                      value={fontWeight}
                      onChange={(e) => setFontWeight(parseInt(e.target.value))}
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>
              )}

              {tool !== 'none' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  {['rect', 'circle', 'text'].includes(tool) && (
                    <div style={{ display: 'flex', gap: '1rem', padding: '0.25rem 0' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', cursor: 'pointer', color: 'white' }}>
                        <input
                          type="checkbox"
                          checked={strokeEnabled}
                          onChange={(e) => setStrokeEnabled(e.target.checked)}
                        />
                        <span>Outline Border</span>
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', cursor: 'pointer', color: 'white' }}>
                        <input
                          type="checkbox"
                          checked={fillEnabled}
                          onChange={(e) => setFillEnabled(e.target.checked)}
                        />
                        <span>Fill Shape</span>
                      </label>
                    </div>
                  )}

                  {strokeEnabled && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'white' }}>
                        <span>{tool === 'text' ? 'Text Border Thickness' : 'Line Thickness'}</span>
                        <span>{brushSize}px</span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="80"
                        value={brushSize}
                        onChange={(e) => setBrushSize(parseInt(e.target.value))}
                      />
                    </div>
                  )}

                  {['brush', 'erase'].includes(tool) && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'white' }}>
                        <span>Brush Size</span>
                        <span>{brushSize}px</span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="150"
                        value={brushSize}
                        onChange={(e) => setBrushSize(parseInt(e.target.value))}
                      />
                    </div>
                  )}

                  {tool !== 'erase' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'white' }}>
                        <span>Tool Opacity</span>
                        <span>{Math.round(brushOpacity * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0.05"
                        max="1"
                        step="0.05"
                        value={brushOpacity}
                        onChange={(e) => setBrushOpacity(parseFloat(e.target.value))}
                      />
                    </div>
                  )}

                  {strokeEnabled && (
                    <ColorPickerPanel
                      label={tool === 'text' ? 'Border Color' : 'Stroke/Line Color'}
                      color={strokeColor}
                      onChange={setStrokeColor}
                    />
                  )}

                  {fillEnabled && ['rect', 'circle', 'text'].includes(tool) && (
                    <ColorPickerPanel
                      label="Fill Color"
                      color={fillColor}
                      onChange={setFillColor}
                    />
                  )}
                </div>
              )}
            </div>
          )}

          {/* Layer List Panel */}
          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem', marginTop: '0.5rem' }}>
            <LayerPanel
              layers={activeComponent.layers || []}
              activeLayerId={activeLayerId}
              onSelectLayer={setActiveLayerId}
              onAddLayer={handleAddNewLayer}
              onDeleteLayer={handleDeleteLayer}
              onToggleVisibility={handleToggleLayerVisibility}
              onDuplicateLayer={handleDuplicateLayer}
              onMoveLayer={handleMoveLayer}
            />
          </div>
        </>
      ) : (
        <div style={{ padding: '2rem 0', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
          No active layer selected.
        </div>
      )}
    </div>
  );
};

export default PropertySidebar;
export { ColorPickerPanel };
