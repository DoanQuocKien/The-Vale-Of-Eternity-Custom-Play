import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAppStore } from '../../store/useAppStore.js';
import { DEFAULT_LAYOUT } from '../../utils/constants.jsx';
import { Plus, FileText, Trash2 } from 'lucide-react';
import html2canvas from 'html2canvas';
import { convertCqwToPxRecursively } from '../../utils/pdfUtils.js';
import { drawShape } from '../../utils/canvasUtils.js';

// ─── Sub-components ─────────────────────────────────────────────────────────
import CardPreview from '../CardEditor/CardPreview.jsx';
import CanvasWorkspace from './CanvasWorkspace.jsx';
import PropertySidebar from './PropertySidebar.jsx';

const PRESETS = [
  { name: 'Player Board (A4 Landscape)', type: 'board', widthMm: 297, heightMm: 210, bleedMm: 3 },
  { name: 'Resource Track (Small)', type: 'track', widthMm: 148, heightMm: 55, bleedMm: 3 },
  { name: 'Tile (Square)', type: 'tile', widthMm: 63.5, heightMm: 63.5, bleedMm: 3 },
  { name: 'Tile Sheet (A4 Portrait)', type: 'tile-sheet', widthMm: 210, heightMm: 297, bleedMm: 3 },
];

export default function ComponentDesigner({ onShowArtImporter }) {
  const activePackId = useAppStore(state => state.activePackId);
  const components = useAppStore(state => state.components);
  const activeComponent = useAppStore(state => state.activeComponent);
  const setActiveComponent = useAppStore(state => state.setActiveComponent);
  const saveComponentStore = useAppStore(state => state.saveComponent);
  const deleteComponent = useAppStore(state => state.deleteComponent);
  const loadComponents = useAppStore(state => state.loadComponents);
  const hasUnsavedChanges = useAppStore(state => state.hasUnsavedChanges);
  const setHasUnsavedChanges = useAppStore(state => state.setHasUnsavedChanges);

  const saveComponent = async (updatedComp) => {
    const result = await saveComponentStore(updatedComp);
    setHasUnsavedChanges(false);
    return result;
  };

  // Component metadata states
  const [compName, setCompName] = useState('');
  const [compBleed, setCompBleed] = useState(3);
  const [foldLines, setFoldLines] = useState([]);
  const [newFoldType, setNewFoldType] = useState('horizontal');
  const [newFoldPos, setNewFoldPos] = useState('');

  // Track what was last loaded so we can distinguish sync-writes from real edits
  const loadedCompValuesRef = useRef({ name: '', bleedMm: 3, foldLines: [] });

  // Set unsaved changes only when values actually differ from what was loaded
  useEffect(() => {
    const loaded = loadedCompValuesRef.current;
    const hasChanged =
      compName !== loaded.name ||
      compBleed !== loaded.bleedMm ||
      JSON.stringify(foldLines) !== JSON.stringify(loaded.foldLines);
    if (hasChanged) {
      setHasUnsavedChanges(true);
    }
  }, [compName, compBleed, foldLines]);

  // Layer stack states
  const [activeLayerId, setActiveLayerId] = useState(null);
  const imageCacheRef = useRef({});

  // Library picker state for image layers
  const [showLibraryPicker, setShowLibraryPicker] = useState(false);
  const [pendingLayerId, setPendingLayerId] = useState(null);
  const [renderingCard, setRenderingCard] = useState(null);
  const cardRenderRef = useRef(null);

  // New component modal state
  const [showNewModal, setShowNewModal] = useState(false);
  const [newPresetType, setNewPresetType] = useState('board');
  const [newWidthMm, setNewWidthMm] = useState(297);
  const [newHeightMm, setNewHeightMm] = useState(210);
  const [newBleedMm, setNewBleedMm] = useState(3);
  const [newName, setNewName] = useState('');

  // Canvas Refs
  const canvasRef = useRef(null);
  const drawingCanvasRef = useRef(null);
  const imageFileInputRef = useRef(null);

  // Zoom & Pan
  const [zoom, setZoom] = useState(0.5);
  const [pan, setPan] = useState({ x: 20, y: 20 });
  const [panMode, setPanMode] = useState(false);
  const isPanning = useRef(false);
  const [isPanningState, setIsPanningState] = useState(false);
  const lastPanPos = useRef({ x: 0, y: 0 });
  const panRef = useRef({ x: 20, y: 20 });

  // Drawing tools state
  const [tool, setTool] = useState('brush'); // 'brush', 'erase', 'line', 'rect', 'circle', 'text', 'none'
  const [strokeColor, setStrokeColor] = useState('#6366f1');
  const [fillColor, setFillColor] = useState('#a78bfa');
  const [strokeEnabled, setStrokeEnabled] = useState(true);
  const [fillEnabled, setFillEnabled] = useState(false);
  const [brushSize, setBrushSize] = useState(15);
  const [brushOpacity, setBrushOpacity] = useState(1);
  const [fontSize, setFontSize] = useState(48);
  const [textString, setTextString] = useState('Text Label');
  const [fontWeight, setFontWeight] = useState(30);

  // Drawing state tracking
  const isDrawing = useRef(false);
  const lastDrawingPos = useRef({ x: 0, y: 0 });
  const isDrawingShape = useRef(false);
  const startPosRef = useRef({ x: 0, y: 0 });
  const activeCoordsRef = useRef(null);

  // Undo list
  const [undoList, setUndoList] = useState([]);

  const openLibraryPicker = useCallback((layerId) => {
    setPendingLayerId(layerId);
    setShowLibraryPicker(true);
  }, []);

  const handlePickLibraryItem = useCallback((dataUrl) => {
    if (!pendingLayerId) return;
    handleUpdateLayer(pendingLayerId, {
      imageDataUrl: dataUrl,
      scale: 1, rotation: 0, transformX: 0, transformY: 0
    });
    setShowLibraryPicker(false);
    setPendingLayerId(null);
  }, [pendingLayerId]);

  const handleRenderAndPickCard = useCallback(async (card) => {
    setRenderingCard(card);
    
    setTimeout(async () => {
      try {
        if (!cardRenderRef.current) throw new Error('Render container not available');
        await new Promise(r => setTimeout(r, 600));

        const containerWidth = cardRenderRef.current.getBoundingClientRect().width || 744;
        const restore = convertCqwToPxRecursively(cardRenderRef.current, containerWidth);

        const canvas = await html2canvas(cardRenderRef.current, {
          scale: 3.0,
          useCORS: true,
          backgroundColor: null,
          logging: false
        });
        
        restore();
        
        const dataUrl = canvas.toDataURL('image/png');
        handlePickLibraryItem(dataUrl);
      } catch (err) {
        console.error('[LibraryCardRender] Failed:', err);
        alert('Failed to import card: ' + err.message);
      } finally {
        setRenderingCard(null);
      }
    }, 300);
  }, [pendingLayerId, handlePickLibraryItem]);

  // Spacebar pan listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Space' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'SELECT' && document.activeElement.tagName !== 'TEXTAREA') {
        e.preventDefault();
        setPanMode(true);
      }
    };
    const handleKeyUp = (e) => {
      if (e.code === 'Space') {
        setPanMode(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Sync state and initialize canvases when activeComponent changes
  useEffect(() => {
    if (activeComponent) {
      const name = activeComponent.name || '';
      const bleedMm = activeComponent.bleedMm ?? 3;
      const foldLinesData = activeComponent.foldLines || [];

      // Record what was loaded so the dirty-check effect can compare against it
      loadedCompValuesRef.current = { name, bleedMm, foldLines: foldLinesData };

      setCompName(name);
      setCompBleed(bleedMm);
      setFoldLines(foldLinesData);
      setHasUnsavedChanges(false);

      const layers = activeComponent.layers || [];
      if (layers.length > 0) {
        const hasActive = layers.some(l => l.id === activeLayerId);
        if (!hasActive) {
          setActiveLayerId(layers[layers.length - 1].id);
        }
      }

      const widthPx = Math.round(activeComponent.widthMm * 11.811);
      const heightPx = Math.round(activeComponent.heightMm * 11.811);

      const drawCvs = drawingCanvasRef.current || document.createElement('canvas');
      drawCvs.width = widthPx;
      drawCvs.height = heightPx;
      drawingCanvasRef.current = drawCvs;

      const workspaceWidth = 800;
      const workspaceHeight = 550;
      const fitZoom = Math.min((workspaceWidth - 60) / widthPx, (workspaceHeight - 60) / heightPx);
      setZoom(Math.max(0.15, Math.min(2.5, fitZoom)));
      const initPan = { x: 30, y: 30 };
      setPan(initPan);
      panRef.current = initPan;
      setUndoList([]);
    } else {
      loadedCompValuesRef.current = { name: '', bleedMm: 3, foldLines: [] };
      setCompName('');
      setActiveLayerId(null);
      setFoldLines([]);
      setHasUnsavedChanges(false);
    }
  }, [activeComponent?.id]);

  // Load components on pack change
  useEffect(() => {
    if (activePackId) {
      loadComponents(activePackId);
    }
  }, [activePackId, loadComponents]);

  // Sync drawingCanvasRef when active layer changes
  useEffect(() => {
    if (activeComponent && activeLayerId) {
      const activeLayer = activeComponent.layers?.find(l => l.id === activeLayerId);
      if (activeLayer && activeLayer.type === 'drawing') {
        const drawCvs = drawingCanvasRef.current;
        if (drawCvs) {
          const drawCtx = drawCvs.getContext('2d');
          drawCtx.clearRect(0, 0, drawCvs.width, drawCvs.height);
          if (activeLayer.drawingData) {
            const img = new Image();
            img.onload = () => {
              drawCtx.drawImage(img, 0, 0);
              redrawComposite();
            };
            img.src = activeLayer.drawingData;
          } else {
            redrawComposite();
          }
        }
      } else {
        redrawComposite();
      }
    }
  }, [activeLayerId, activeComponent?.id]);

  // Redraw composite when settings, layers list, or drawing tool changes
  useEffect(() => {
    redrawComposite();
  }, [activeComponent, tool, activeLayerId]);

  const redrawComposite = () => {
    const canvas = canvasRef.current;
    if (!canvas || !activeComponent) return;
    const ctx = canvas.getContext('2d');
    
    const widthPx = Math.round(activeComponent.widthMm * 11.811);
    const heightPx = Math.round(activeComponent.heightMm * 11.811);

    ctx.clearRect(0, 0, widthPx, heightPx);

    const layers = activeComponent.layers || [];
    let needsLoading = false;
    layers.forEach(layer => {
      if (layer.type === 'drawing' && layer.drawingData) {
        const cached = imageCacheRef.current[layer.id];
        if (!cached || cached.src !== layer.drawingData) {
          needsLoading = true;
          const img = new Image();
          img.onload = () => {
            imageCacheRef.current[layer.id] = img;
            redrawComposite();
          };
          img.src = layer.drawingData;
        }
      }
      if (layer.type === 'image' && layer.imageDataUrl) {
        const cached = imageCacheRef.current[layer.id];
        if (!cached || cached.src !== layer.imageDataUrl) {
          needsLoading = true;
          const img = new Image();
          img.onload = () => {
            imageCacheRef.current[layer.id] = img;
            redrawComposite();
          };
          img.src = layer.imageDataUrl;
        }
      }
    });

    if (needsLoading) {
      ctx.fillStyle = '#0b0f19';
      ctx.fillRect(0, 0, widthPx, heightPx);
      return;
    }

    layers.forEach(layer => {
      if (!layer.visible) return;

      ctx.save();
      ctx.globalAlpha = layer.opacity ?? 1.0;

      if (layer.type === 'fill') {
        ctx.fillStyle = layer.fillColor || '#3b82f6';
        ctx.fillRect(0, 0, widthPx, heightPx);
      } 
      else if (layer.type === 'drawing') {
        const cachedImg = imageCacheRef.current[layer.id];
        if (cachedImg) {
          ctx.drawImage(cachedImg, 0, 0);
        }
        if (layer.id === activeLayerId && isDrawingShape.current && startPosRef.current && activeCoordsRef.current) {
          drawShape(ctx, tool, startPosRef.current, activeCoordsRef.current, {
            strokeColor,
            fillColor,
            strokeEnabled,
            fillEnabled,
            brushSize,
            opacity: brushOpacity,
            fontSize,
            textString,
            fontWeight
          });
        }
      }
      else if (layer.type === 'image') {
        const cachedImg = imageCacheRef.current[layer.id];
        if (cachedImg) {
          const scale = layer.scale ?? 1;
          const rotation = layer.rotation ?? 0;
          const tx = (layer.transformX ?? 0) * 11.811;
          const ty = (layer.transformY ?? 0) * 11.811;
          
          ctx.save();
          ctx.translate(widthPx / 2 + tx, heightPx / 2 + ty);
          ctx.rotate((rotation * Math.PI) / 180);
          ctx.scale(scale, scale);
          ctx.drawImage(cachedImg, -cachedImg.width / 2, -cachedImg.height / 2);
          ctx.restore();
        }
      }
      else if (layer.type === 'text') {
        const textX = (layer.textX ?? Math.round(activeComponent.widthMm / 2)) * 11.811;
        const textY = (layer.textY ?? Math.round(activeComponent.heightMm / 2)) * 11.811;
        
        ctx.font = `bold ${layer.fontSize ?? 48}px ${layer.fontFamily || 'NorseBold'}`;
        ctx.textAlign = layer.textAlign || 'center';
        ctx.textBaseline = 'middle';
        
        if (layer.fillEnabled ?? true) {
          ctx.fillStyle = layer.fillColor || '#ffffff';
          ctx.fillText(layer.text || 'Text Label', textX, textY);
        }
        if (layer.strokeEnabled ?? false) {
          ctx.strokeStyle = layer.strokeColor || '#000000';
          ctx.lineWidth = layer.lineWidth ?? 2;
          ctx.strokeText(layer.text || 'Text Label', textX, textY);
        }
      }
      else if (layer.type === 'grid') {
        const gRows = layer.gridRows ?? 5;
        const gCols = layer.gridCols ?? 5;
        const cSizeMm = layer.cellSizeMm ?? 20;
        const cGapMm = layer.cellGapMm ?? 2;
        const gX = layer.gridX ?? 10;
        const gY = layer.gridY ?? 10;
        
        const cellW = cSizeMm * 11.811;
        const cellH = cSizeMm * 11.811;
        const gap = cGapMm * 11.811;
        const startX = gX * 11.811;
        const startY = gY * 11.811;
        
        const strokeEn = layer.strokeEnabled ?? true;
        const fillEn = layer.fillEnabled ?? false;
        const sColor = layer.strokeColor ?? '#ffffff';
        const fColor = layer.fillColor ?? '#6366f1';
        const lWidth = layer.lineWidth ?? 2;
        const showNum = layer.showNumbers ?? true;
        const labels = layer.cellLabels ?? [];

        ctx.lineWidth = lWidth;
        ctx.strokeStyle = sColor;
        ctx.fillStyle = fColor;
        
        for (let r = 0; r < gRows; r++) {
          for (let c = 0; c < gCols; c++) {
            const cellX = startX + c * (cellW + gap);
            const cellY = startY + r * (cellH + gap);
            
            ctx.beginPath();
            ctx.rect(cellX, cellY, cellW, cellH);
            if (fillEn) ctx.fill();
            if (strokeEn) ctx.stroke();
            
            const cellIndex = r * gCols + c;
            let cellText = '';
            if (labels[cellIndex] !== undefined && labels[cellIndex] !== '') {
              cellText = labels[cellIndex];
            } else if (showNum) {
              cellText = String(cellIndex + 1);
            }
            
            if (cellText) {
              ctx.save();
              ctx.fillStyle = strokeEn ? sColor : '#ffffff';
              ctx.font = `bold ${Math.max(12, cellH * 0.22)}px NorseBold, sans-serif`;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(cellText, cellX + cellW / 2, cellY + cellH / 2);
              ctx.restore();
            }
          }
        }
      }

      ctx.restore();
    });

    // Draw safety/bleed border (dashed red)
    const bleedPx = Math.round((activeComponent.bleedMm ?? 3) * 11.811);
    if (bleedPx > 0) {
      ctx.save();
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 8]);
      ctx.strokeRect(bleedPx, bleedPx, widthPx - 2 * bleedPx, heightPx - 2 * bleedPx);
      ctx.restore();
    }
  };

  const saveUndoState = () => {
    if (!drawingCanvasRef.current) return;
    const snapshot = drawingCanvasRef.current.toDataURL('image/png');
    setUndoList(prev => [...prev.slice(-19), snapshot]);
  };

  const handleUndo = () => {
    if (undoList.length === 0 || !drawingCanvasRef.current) return;
    const prevStates = [...undoList];
    const prevState = prevStates.pop();
    setUndoList(prevStates);

    const ctx = drawingCanvasRef.current.getContext('2d');
    ctx.clearRect(0, 0, drawingCanvasRef.current.width, drawingCanvasRef.current.height);

    if (prevState) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0);
        redrawComposite();
        saveComponentDrawing();
      };
      img.src = prevState;
    } else {
      redrawComposite();
      saveComponentDrawing();
    }
  };

  const handleClearDrawing = () => {
    if (window.confirm('Clear all drawing layers from this component?')) {
      saveUndoState();
      const ctx = drawingCanvasRef.current.getContext('2d');
      ctx.clearRect(0, 0, drawingCanvasRef.current.width, drawingCanvasRef.current.height);
      redrawComposite();
      saveComponentDrawing();
    }
  };

  const saveComponentDrawing = () => {
    if (!activeComponent || !drawingCanvasRef.current || !canvasRef.current) return;
    
    const drawingDataUrl = drawingCanvasRef.current.toDataURL('image/png');
    const updatedLayers = activeComponent.layers.map(l => {
      if (l.id === activeLayerId) {
        return { ...l, drawingData: drawingDataUrl };
      }
      return l;
    });

    saveComponent({
      ...activeComponent,
      layers: updatedLayers,
      canvasData: canvasRef.current.toDataURL('image/png')
    });
  };

  const getCanvasCoords = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    return {
      x: x * (canvas.width / rect.width),
      y: y * (canvas.height / rect.height)
    };
  };

  const handlePointerDown = (e) => {
    if (e.target.closest('button, a, input, select')) return;

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (err) { }

    const isPanAction = panMode || tool === 'none' || e.button === 1 || e.button === 2;
    if (isPanAction) {
      isPanning.current = true;
      setIsPanningState(true);
      lastPanPos.current = { x: e.clientX, y: e.clientY };
      setPan(currentPan => {
        panRef.current = currentPan;
        return currentPan;
      });
      e.preventDefault();
      return;
    }

    if (!drawingCanvasRef.current || !activeComponent) return;

    const activeLayer = activeComponent.layers?.find(l => l.id === activeLayerId);
    if (!activeLayer || activeLayer.type !== 'drawing') return;

    const coords = getCanvasCoords(e);
    if (!coords) return;

    const widthPx = Math.round(activeComponent.widthMm * 11.811);
    const heightPx = Math.round(activeComponent.heightMm * 11.811);

    if (coords.x < 0 || coords.x > widthPx || coords.y < 0 || coords.y > heightPx) return;

    if (tool === 'text') {
      saveUndoState();
      const ctx = drawingCanvasRef.current.getContext('2d');
      drawShape(ctx, 'text', coords, coords, {
        strokeColor,
        fillColor,
        strokeEnabled,
        fillEnabled,
        brushSize,
        opacity: brushOpacity,
        fontSize,
        textString,
        fontWeight
      });
      saveComponentDrawing();
      redrawComposite();
      return;
    }

    if (['line', 'rect', 'circle'].includes(tool)) {
      saveUndoState();
      isDrawingShape.current = true;
      startPosRef.current = coords;
      return;
    }

    saveUndoState();
    isDrawing.current = true;
    lastDrawingPos.current = coords;

    const ctx = drawingCanvasRef.current.getContext('2d');
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = brushSize;
    ctx.globalAlpha = brushOpacity;

    if (tool === 'erase') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.arc(coords.x, coords.y, brushSize / 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = strokeColor;
      ctx.beginPath();
      ctx.moveTo(coords.x, coords.y);
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
    }
    ctx.restore();
    redrawComposite();
  };

  const handlePointerMove = (e) => {
    if (isPanning.current) {
      const dx = e.clientX - lastPanPos.current.x;
      const dy = e.clientY - lastPanPos.current.y;
      lastPanPos.current = { x: e.clientX, y: e.clientY };
      const newPan = {
        x: panRef.current.x + dx,
        y: panRef.current.y + dy
      };
      panRef.current = newPan;
      setPan({ ...newPan });
      return;
    }

    const coords = getCanvasCoords(e);
    if (!coords) return;
    activeCoordsRef.current = coords;

    if (isDrawingShape.current && startPosRef.current) {
      redrawComposite();
      return;
    }

    if (isDrawing.current && ['brush', 'erase'].includes(tool)) {
      const ctx = drawingCanvasRef.current.getContext('2d');
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = brushSize;
      ctx.globalAlpha = brushOpacity;

      if (tool === 'erase') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath();
        ctx.moveTo(lastDrawingPos.current.x, lastDrawingPos.current.y);
        ctx.lineTo(coords.x, coords.y);
        ctx.stroke();
      } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = strokeColor;
        ctx.beginPath();
        ctx.moveTo(lastDrawingPos.current.x, lastDrawingPos.current.y);
        ctx.lineTo(coords.x, coords.y);
        ctx.stroke();
      }
      ctx.restore();

      lastDrawingPos.current = coords;
      redrawComposite();
    }
  };

  const handlePointerUp = (e) => {
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (err) { }

    if (isPanning.current) {
      isPanning.current = false;
      setIsPanningState(false);
      return;
    }

    const coords = getCanvasCoords(e);
    if (isDrawingShape.current && startPosRef.current && drawingCanvasRef.current && coords) {
      const ctx = drawingCanvasRef.current.getContext('2d');
      drawShape(ctx, tool, startPosRef.current, coords, {
        strokeColor,
        fillColor,
        strokeEnabled,
        fillEnabled,
        brushSize,
        opacity: brushOpacity,
        fontSize,
        textString,
        fontWeight
      });
      isDrawingShape.current = false;
      startPosRef.current = null;
      activeCoordsRef.current = null;
      saveComponentDrawing();
      redrawComposite();
    }

    if (isDrawing.current) {
      isDrawing.current = false;
      saveComponentDrawing();
    }
  };

  const handleZoomIn = () => setZoom(z => Math.min(8, z + 0.15));
  const handleZoomOut = () => setZoom(z => Math.max(0.05, z - 0.15));
  const handleZoomReset = () => {
    if (activeComponent) {
      const wPx = Math.round(activeComponent.widthMm * 11.811);
      const hPx = Math.round(activeComponent.heightMm * 11.811);
      const fitZoom = Math.min((800 - 60) / wPx, (550 - 60) / hPx);
      setZoom(fitZoom);
    } else {
      setZoom(0.5);
    }
    const resetPan = { x: 30, y: 30 };
    setPan(resetPan);
    panRef.current = resetPan;
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const delta = -e.deltaY;
    const zoomFactor = delta > 0 ? 1.08 : 0.93;
    setZoom(z => Math.max(0.05, Math.min(8, z * zoomFactor)));
  };

  const handleImageFileUpload = (e, layerId) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      handleUpdateLayer(layerId, {
        imageDataUrl: evt.target.result,
        scale: 1,
        rotation: 0,
        transformX: 0,
        transformY: 0
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleAddNewLayer = (type) => {
    if (!activeComponent) return;
    const newLayer = {
      id: 'layer-' + Date.now(),
      type,
      name: `${type.charAt(0).toUpperCase() + type.slice(1)} Layer ${(activeComponent.layers || []).length + 1}`,
      visible: true,
      opacity: 1,
      ...(type === 'fill' ? { fillColor: '#3b82f6' } : {}),
      ...(type === 'text' ? { text: 'Round Track', fontFamily: 'NorseBold', fontSize: 48, fillColor: '#ffffff', fillEnabled: true, textX: Math.round(activeComponent.widthMm / 2), textY: Math.round(activeComponent.heightMm / 2) } : {}),
      ...(type === 'grid' ? { gridRows: 5, gridCols: 5, cellSizeMm: 20, cellGapMm: 2, gridX: 10, gridY: 10, strokeColor: '#ffffff', fillColor: '#6366f1', strokeEnabled: true, fillEnabled: false, lineWidth: 2, showNumbers: true, cellLabels: [] } : {}),
      ...(type === 'drawing' ? { drawingData: null } : {}),
      ...(type === 'image' ? { imageDataUrl: null, scale: 1, rotation: 0, transformX: 0, transformY: 0 } : {})
    };
    const updatedLayers = [...(activeComponent.layers || []), newLayer];
    saveComponent({
      ...activeComponent,
      layers: updatedLayers
    });
    setActiveLayerId(newLayer.id);
  };

  const handleDeleteLayer = (layerId) => {
    if (!activeComponent || (activeComponent.layers || []).length <= 1) return;
    if (window.confirm('Are you sure you want to delete this layer?')) {
      const updatedLayers = activeComponent.layers.filter(l => l.id !== layerId);
      saveComponent({
        ...activeComponent,
        layers: updatedLayers
      });
      if (activeLayerId === layerId) {
        setActiveLayerId(updatedLayers[updatedLayers.length - 1].id);
      }
    }
  };

  const handleUpdateLayer = (layerId, updatedProperties) => {
    if (!activeComponent) return;
    const updatedLayers = activeComponent.layers.map(l => {
      if (l.id === layerId) {
        return { ...l, ...updatedProperties };
      }
      return l;
    });
    saveComponent({
      ...activeComponent,
      layers: updatedLayers
    });
  };

  const handleToggleLayerVisibility = (layerId) => {
    if (!activeComponent) return;
    const layer = activeComponent.layers.find(l => l.id === layerId);
    if (layer) {
      handleUpdateLayer(layerId, { visible: !layer.visible });
    }
  };

  const handleDuplicateLayer = (layer) => {
    if (!activeComponent) return;
    const newLayer = {
      ...layer,
      id: 'layer-' + Date.now(),
      name: `${layer.name} (Copy)`
    };
    const updatedLayers = [...activeComponent.layers, newLayer];
    saveComponent({
      ...activeComponent,
      layers: updatedLayers
    });
    setActiveLayerId(newLayer.id);
  };

  const handleMoveLayer = (dragIndex, hoverIndex) => {
    if (!activeComponent) return;
    const dragLayers = [...activeComponent.layers];
    const dragLayer = dragLayers[dragIndex];
    dragLayers.splice(dragIndex, 1);
    dragLayers.splice(hoverIndex, 0, dragLayer);
    saveComponent({
      ...activeComponent,
      layers: dragLayers
    });
  };

  // Component setup
  const handleOpenNewModal = () => {
    setNewName('');
    setNewPresetType('board');
    setNewWidthMm(297);
    setNewHeightMm(210);
    setNewBleedMm(3);
    setShowNewModal(true);
  };

  const handlePresetSelect = (presetType) => {
    setNewPresetType(presetType);
    if (presetType === 'board') {
      setNewWidthMm(297);
      setNewHeightMm(210);
    } else if (presetType === 'track') {
      setNewWidthMm(148);
      setNewHeightMm(55);
    } else if (presetType === 'tile') {
      setNewWidthMm(63.5);
      setNewHeightMm(63.5);
    } else if (presetType === 'tile-sheet') {
      setNewWidthMm(210);
      setNewHeightMm(297);
    }
  };

  const handleCreateComponentConfirm = async () => {
    const w = parseFloat(newWidthMm);
    const h = parseFloat(newHeightMm);
    const b = parseFloat(newBleedMm);

    if (isNaN(w) || w <= 0 || isNaN(h) || h <= 0) {
      alert('Please enter valid physical dimensions (positive numbers).');
      return;
    }

    const newComp = {
      name: newName.trim() || `Untitled ${newPresetType === 'custom' ? 'Component' : newPresetType}`,
      packId: activePackId,
      type: newPresetType,
      widthMm: w,
      heightMm: h,
      bleedMm: isNaN(b) ? 3 : b,
      canvasData: null,
      layers: [
        {
          id: 'layer-draw-default',
          type: 'drawing',
          name: 'Main Drawing',
          visible: true,
          opacity: 1,
          drawingData: null
        }
      ],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    const saved = await saveComponent(newComp);
    
    // Pre-initialize drawing canvas to prevent render crashes
    const drawCvs = drawingCanvasRef.current || document.createElement('canvas');
    drawCvs.width = Math.round(saved.widthMm * 11.811);
    drawCvs.height = Math.round(saved.heightMm * 11.811);
    drawingCanvasRef.current = drawCvs;

    setActiveComponent(saved);
    setShowNewModal(false);
  };

  const handleAddFoldLine = () => {
    if (!activeComponent) return;
    const pos = parseFloat(newFoldPos);
    if (isNaN(pos) || pos <= 0) {
      alert('Please enter a valid positive number for the position.');
      return;
    }
    const maxVal = newFoldType === 'horizontal' ? activeComponent.heightMm : activeComponent.widthMm;
    if (pos >= maxVal) {
      alert(`Fold line position exceeds the component boundary (${maxVal} mm).`);
      return;
    }
    const updated = [...foldLines, { type: newFoldType, positionMm: pos }];
    setFoldLines(updated);
    setNewFoldPos('');
  };

  const handleRemoveFoldLine = (index) => {
    const updated = foldLines.filter((_, idx) => idx !== index);
    setFoldLines(updated);
  };

  const handleSaveSettings = async () => {
    if (!activeComponent) return;
    const b = parseFloat(compBleed);
    const updated = {
      ...activeComponent,
      name: compName.trim() || 'Unnamed Component',
      bleedMm: isNaN(b) ? 3 : b,
      foldLines,
      updatedAt: Date.now()
    };
    await saveComponent(updated);
    alert('Settings updated successfully!');
  };

  const handleDeleteActiveComponent = async (compId) => {
    if (window.confirm('Are you sure you want to delete this component? This cannot be undone.')) {
      await deleteComponent(compId);
    }
  };

  const widthPx = activeComponent ? Math.round(activeComponent.widthMm * 11.811) : 0;
  const heightPx = activeComponent ? Math.round(activeComponent.heightMm * 11.811) : 0;
  
  const layers = activeComponent?.layers || [];
  const activeLayer = layers.find(l => l.id === activeLayerId);
  const isDrawingLayerActive = activeLayer && activeLayer.type === 'drawing';

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '300px 1fr',
      gap: '2rem',
      marginTop: '1rem',
      alignItems: 'start',
      minHeight: '70vh'
    }}>
      {/* SIDEBAR LEFT: List of components & settings */}
      <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#818cf8', display: 'flex', alignItems: 'center', gap: '0.4rem', margin: 0 }}>
            🗃️ Board Components
          </h3>
          <button
            onClick={handleOpenNewModal}
            style={{
              padding: '0.35rem 0.6rem',
              background: 'var(--color-primary)',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.75rem',
              fontWeight: 700,
              cursor: 'pointer',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem'
            }}
          >
            <Plus size={12} /> Add
          </button>
        </div>

        {/* Scrollable list of components */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
          maxHeight: '160px',
          overflowY: 'auto',
          paddingRight: '0.25rem',
          borderBottom: '1px solid var(--border-color)',
          paddingBottom: '1rem'
        }}>
          {components.length === 0 ? (
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '2rem 0' }}>
              No board components yet. Click "Add" to start.
            </div>
          ) : (
            components.map(comp => (
              <div
                key={comp.id}
                onClick={() => setActiveComponent(comp)}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.6rem 0.75rem',
                  background: activeComponent?.id === comp.id ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                  border: activeComponent?.id === comp.id ? '1px solid var(--color-primary)' : '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxSizing: 'border-box'
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem', minWidth: 0 }}>
                  <span style={{
                    fontSize: '0.82rem',
                    fontWeight: activeComponent?.id === comp.id ? 700 : 500,
                    color: activeComponent?.id === comp.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    maxWidth: '150px'
                  }}>
                    {comp.name}
                  </span>
                  <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                    {comp.type} • {comp.widthMm}x{comp.heightMm}mm
                  </span>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeleteActiveComponent(comp.id); }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    padding: '2px',
                    borderRadius: '4px',
                    transition: 'color 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-danger)'}
                  onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Active Component general configurations */}
        {activeComponent && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <label style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)' }}>Name</label>
              <input
                type="text"
                value={compName}
                onChange={(e) => setCompName(e.target.value)}
                style={{
                  padding: '0.35rem 0.6rem',
                  background: 'var(--bg-main)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.75rem',
                  outline: 'none',
                  color: 'white'
                }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <label style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)' }}>Bleed (mm)</label>
              <input
                type="number"
                value={compBleed}
                onChange={(e) => setCompBleed(e.target.value)}
                style={{
                  padding: '0.35rem 0.6rem',
                  background: 'var(--bg-main)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.75rem',
                  outline: 'none',
                  color: 'white'
                }}
                min="0"
                max="20"
                step="0.5"
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <label style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)' }}>Fold Lines (mm)</label>
              <div style={{ display: 'flex', gap: '0.25rem' }}>
                <select
                  value={newFoldType}
                  onChange={(e) => setNewFoldType(e.target.value)}
                  style={{
                    padding: '0.35rem',
                    background: 'var(--bg-main)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.75rem',
                    color: 'white'
                  }}
                >
                  <option value="horizontal">Horiz</option>
                  <option value="vertical">Vert</option>
                </select>
                <input
                  type="number"
                  placeholder="Pos"
                  value={newFoldPos}
                  onChange={(e) => setNewFoldPos(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '0.35rem 0.5rem',
                    background: 'var(--bg-main)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.75rem',
                    color: 'white',
                    outline: 'none'
                  }}
                  min="0"
                />
                <button
                  onClick={handleAddFoldLine}
                  className="btn"
                  style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem', fontWeight: 700 }}
                >
                  Add
                </button>
              </div>
              
              {foldLines.length > 0 && (
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '0.25rem',
                  maxHeight: '80px',
                  overflowY: 'auto',
                  background: 'rgba(0,0,0,0.2)',
                  padding: '0.35rem',
                  borderRadius: 'var(--radius-sm)',
                  marginTop: '0.25rem',
                  border: '1px solid var(--border-color)'
                }} className="comp-scroll">
                  {foldLines.map((fl, idx) => (
                    <span
                      key={idx}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        background: 'rgba(99, 102, 241, 0.1)',
                        border: '1px solid rgba(99, 102, 241, 0.2)',
                        padding: '0.15rem 0.35rem',
                        borderRadius: '4px',
                        fontSize: '0.68rem',
                        color: 'white'
                      }}
                    >
                      {fl.type === 'horizontal' ? 'H' : 'V'}: {fl.positionMm} mm
                      <button
                        onClick={() => handleRemoveFoldLine(idx)}
                        style={{
                          border: 'none',
                          background: 'none',
                          color: 'var(--color-danger)',
                          cursor: 'pointer',
                          padding: 0,
                          fontSize: '0.8rem',
                          lineHeight: 1
                        }}
                      >
                        &times;
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={handleSaveSettings}
              className="btn"
              style={{ width: '100%', padding: '0.4rem', fontSize: '0.75rem', fontWeight: 700 }}
            >
              Save Settings
            </button>
          </div>
        )}
      </div>

      {/* WORKSPACE & PROPERTIES PANEL */}
      {activeComponent ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 340px',
          gap: '2rem',
          alignItems: 'start'
        }}>
          {/* CENTER: Workspace Viewport */}
          <CanvasWorkspace
            activeComponent={activeComponent}
            widthPx={widthPx}
            heightPx={heightPx}
            canvasRef={canvasRef}
            panMode={panMode}
            tool={tool}
            isPanningState={isPanningState}
            zoom={zoom}
            pan={pan}
            isDrawingLayerActive={isDrawingLayerActive}
            undoList={undoList}
            handleUndo={handleUndo}
            handleClearDrawing={handleClearDrawing}
            handlePointerDown={handlePointerDown}
            handlePointerMove={handlePointerMove}
            handlePointerUp={handlePointerUp}
            handleWheel={handleWheel}
            handleZoomIn={handleZoomIn}
            handleZoomOut={handleZoomOut}
            handleZoomReset={handleZoomReset}
            setTool={setTool}
          />

          {/* RIGHT PANEL: Properties Configuration Panel */}
          <PropertySidebar
            activeComponent={activeComponent}
            activeLayer={activeLayer}
            activeLayerId={activeLayerId}
            setActiveLayerId={setActiveLayerId}
            handleUpdateLayer={handleUpdateLayer}
            showLibraryPicker={showLibraryPicker}
            setShowLibraryPicker={setShowLibraryPicker}
            openLibraryPicker={openLibraryPicker}
            onShowArtImporter={onShowArtImporter}
            tool={tool}
            setTool={setTool}
            strokeColor={strokeColor}
            setStrokeColor={setStrokeColor}
            fillColor={fillColor}
            setFillColor={setFillColor}
            strokeEnabled={strokeEnabled}
            setStrokeEnabled={setStrokeEnabled}
            fillEnabled={fillEnabled}
            setFillEnabled={setFillEnabled}
            brushSize={brushSize}
            setBrushSize={setBrushSize}
            brushOpacity={brushOpacity}
            setBrushOpacity={setBrushOpacity}
            fontSize={fontSize}
            setFontSize={setFontSize}
            textString={textString}
            setTextString={setTextString}
            fontWeight={fontWeight}
            setFontWeight={setFontWeight}
            imageFileInputRef={imageFileInputRef}
            handleImageFileUpload={handleImageFileUpload}
            onPickLibraryItem={handlePickLibraryItem}
            onRenderAndPickCard={handleRenderAndPickCard}
            // Layer list operations
            handleAddNewLayer={handleAddNewLayer}
            handleDeleteLayer={handleDeleteLayer}
            handleToggleLayerVisibility={handleToggleLayerVisibility}
            handleDuplicateLayer={handleDuplicateLayer}
            handleMoveLayer={handleMoveLayer}
          />
        </div>
      ) : (
        <div className="glass-panel" style={{ padding: '3rem', minHeight: '550px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(5, 8, 20, 0.5)' }}>
          <FileText size={48} style={{ marginBottom: '1rem', color: 'rgba(255,255,255,0.1)' }} />
          <h3>No Component Selected</h3>
          <p style={{ fontSize: '0.9rem', maxWidth: '300px', margin: '0.5rem auto 0 auto', textAlign: 'center', color: 'var(--text-muted)' }}>
            Select an existing board component from the list, or click "Add" to configure and design a new layout page.
          </p>
        </div>
      )}

      {/* NEW COMPONENT DIALOG MODAL */}
      {showNewModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          backdropFilter: 'blur(4px)'
        }}>
          <div className="glass-panel animate-fade-in" style={{ padding: '2rem', width: '450px', display: 'flex', flexDirection: 'column', gap: '1.25rem', background: '#111827' }}>
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'white' }}>Create Board Component</h3>

            {/* Component Name */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Component Name</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                style={{
                  padding: '0.45rem 0.75rem',
                  background: 'var(--bg-main)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.85rem',
                  outline: 'none',
                  color: 'white'
                }}
                placeholder="e.g. Round Scoring Track"
              />
            </div>

            {/* Select Preset */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Size Preset</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                {PRESETS.map(p => (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => handlePresetSelect(p.type)}
                    style={{
                      padding: '0.6rem 0.5rem',
                      background: newPresetType === p.type ? 'rgba(99, 102, 241, 0.15)' : 'var(--bg-main)',
                      border: newPresetType === p.type ? '1px solid var(--color-primary)' : '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'white',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    <div>{p.name}</div>
                    <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                      {p.widthMm} x {p.heightMm} mm
                    </div>
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setNewPresetType('custom')}
                  style={{
                    padding: '0.6rem 0.5rem',
                    background: newPresetType === 'custom' ? 'rgba(99, 102, 241, 0.15)' : 'var(--bg-main)',
                    border: newPresetType === 'custom' ? '1px solid var(--color-primary)' : '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'white',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  <div>📐 Custom Size</div>
                  <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                    User dimensions
                  </div>
                </button>
              </div>
            </div>

            {/* Custom inputs */}
            {(newPresetType === 'custom' || true) && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: '0.5rem',
                background: 'rgba(255,255,255,0.02)',
                padding: '0.75rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-color)',
                opacity: newPresetType === 'custom' ? 1 : 0.6,
                pointerEvents: newPresetType === 'custom' ? 'auto' : 'none'
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                  <label style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600 }}>Width (mm)</label>
                  <input
                    type="number"
                    value={newWidthMm}
                    onChange={(e) => setNewWidthMm(e.target.value)}
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
                  <label style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600 }}>Height (mm)</label>
                  <input
                    type="number"
                    value={newHeightMm}
                    onChange={(e) => setNewHeightMm(e.target.value)}
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
                  <label style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600 }}>Bleed (mm)</label>
                  <input
                    type="number"
                    value={newBleedMm}
                    onChange={(e) => setNewBleedMm(e.target.value)}
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
              </div>
            )}

            {/* Buttons */}
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button
                onClick={handleCreateComponentConfirm}
                className="btn"
                style={{ flexGrow: 1, padding: '0.5rem', fontSize: '0.82rem', fontWeight: 700 }}
              >
                Create
              </button>
              <button
                onClick={() => setShowNewModal(false)}
                style={{
                  padding: '0.5rem 1rem',
                  background: 'none',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '0.82rem'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Hidden Card Preview for rendering cards to library image */}
      {renderingCard && (
        <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
          <div ref={cardRenderRef} style={{ width: '744px', height: '1039px' }}>
            <CardPreview card={renderingCard} defaultLayout={DEFAULT_LAYOUT} />
          </div>
        </div>
      )}
    </div>
  );
}
