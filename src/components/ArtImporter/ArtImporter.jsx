import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, ChevronRight } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore.js';

// ─── Stage Components ────────────────────────────────────────────────────────
import Stage0Import from './Stage0Import.jsx';
import Stage1Deskew from './Stage1Deskew.jsx';
import Stage2Enhance from './Stage2Enhance.jsx';
import Stage3Paint from './Stage3Paint.jsx';
import Stage4Placement, { SAFE_ZONE } from './Stage4Placement.jsx';

// ─── Utils ───────────────────────────────────────────────────────────────────
import {
  loadImageFromDataUrl,
  imageToCanvas,
  applyShadowBalance,
  applyColorEnhancement,
  canvasToDataUrl,
  applyBgRemovalMask,
  drawShape,
  applyLineEnhancement
} from '../../utils/canvasUtils.js';
import { removeBackground } from '../../services/bgRemoval.service.js';
import { upscaleImage } from '../../services/upscale.service.js';
import { runPythonImageProcess } from '../../utils/pythonRunner.js';

// Family palette hue angles (HSL degrees) for color tinting
const FAMILY_HUES = {
  Fire: 15,
  Water: 200,
  Earth: 120,
  Wind: 175,
  Dragon: 280,
};

const STAGES = ['import', 'deskew', 'process', 'tune', 'confirm'];
const STAGE_LABELS = ['1. Import', '2. Scan & Deskew', '3. AI Process', '4. Color Tune', '5. Place on Card'];
const STAGE_LABELS_TOKEN = ['1. Import', '2. Scan & Deskew', '3. AI Process', '4. Color Tune', '5. Place on Token'];
const STAGE_LABELS_COMPONENT = ['1. Import', '2. Scan & Deskew', '3. AI Process', '4. Color Tune', '5. Place on Component'];

export default function ArtImporter({
  isOpen,
  onClose,
  onArtConfirmed,
  cardFamily = 'Water',
  existingArt = null,
  existingTransform = null,
  isTokenMode = false,
  isComponentMode = false,
  cardName = '',
  cardCost = 0,
  cardEffect = ''
}) {
  const isCustomMode = isTokenMode || isComponentMode;
  const [stage, setStage] = useState(0); // 0..4
  const [rawDataUrl, setRawDataUrl] = useState(existingArt || null);
  const [deskewedDataUrl, setDeskewedDataUrl] = useState(null);
  const [processedDataUrl, setProcessedDataUrl] = useState(null);
  const [tunedDataUrl, setTunedDataUrl] = useState(null);
  const [finalDataUrl, setFinalDataUrl] = useState(null);

  // Processing state
  const [processing, setProcessing] = useState(false);
  const [progressSteps, setProgressSteps] = useState([
    { label: 'Balance Lighting', done: false, active: false, pct: 0, skip: true },
    { label: 'Enhance Outlines', done: false, active: false, pct: 0, skip: true },
    { label: 'Smart Upscale', done: false, active: false, pct: 0, skip: true },
    { label: 'Remove Background', done: false, active: false, pct: 0, skip: false },
  ]);

  // Color tuning state
  const [tuning, setTuning] = useState({
    vibrance: 0.4,
    familyTint: 0.5,
    brightness: 0,
    contrast: 0,
    hueRotate: 0,
  });

  // Art placement state (for confirm stage)
  const [artTransform, setArtTransform] = useState({
    x: SAFE_ZONE.focalX,   // % position on card
    y: SAFE_ZONE.focalY,   // %
    scale: 60,             // % of card width
    rotation: 0,           // degrees
  });

  // Before/after slider
  const [compareSlider, setCompareSlider] = useState(50);

  // Webcam
  const [showWebcam, setShowWebcam] = useState(false);
  const [webcamStream, setWebcamStream] = useState(null);
  const videoRef = useRef(null);
  const fileInputRef = useRef(null);
  const confirmCanvasRef = useRef(null);

  // Drag state for art placement
  const isDraggingArt = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0, tx: 0, ty: 0 });

  // Brush masking & Drawing suite state
  const [tool, setTool] = useState('brush'); // 'brush', 'line', 'rect', 'circle', 'polygon', 'text', 'erase', 'restore', 'pan'
  const [strokeColor, setStrokeColor] = useState('#000000');
  const [fillColor, setFillColor] = useState('#6366f1');
  const [strokeEnabled, setStrokeEnabled] = useState(true);
  const [fillEnabled, setFillEnabled] = useState(true);
  const [opacity, setOpacity] = useState(1.0);
  const [fontSize, setFontSize] = useState(30);
  const [textString, setTextString] = useState('Creature');
  const [polygonPoints, setPolygonPoints] = useState([]);
  const [fontWeight, setFontWeight] = useState(30);
  const [brushSize, setBrushSize] = useState(20);

  const isDrawingShape = useRef(false);
  const startPosRef = useRef({ x: 0, y: 0 });
  const tunedImgRef = useRef(null);
  const isBrushing = useRef(false);
  const brushLastPosRef = useRef({ x: 0, y: 0 });
  const editedProcessedCanvasRef = useRef(null);
  const originalImgRef = useRef(null);
  const previewCanvasRef = useRef(null);

  // Zoom & Pan state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [panMode, setPanMode] = useState(false);
  const isPanning = useRef(false);
  const [isPanningState, setIsPanningState] = useState(false);
  const lastPanPos = useRef({ x: 0, y: 0 });

  const handleZoomIn = () => setZoom(z => Math.min(8, z + 0.25));
  const handleZoomOut = () => setZoom(z => Math.max(0.5, z - 0.25));
  const handleZoomReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Creation mode state
  const [isCreateMode, setIsCreateMode] = useState(false);

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setStage(existingArt ? 4 : 0);
      setRawDataUrl(existingArt || null);
      setDeskewedDataUrl(existingArt || null);
      setProcessedDataUrl(existingArt || null);
      setTunedDataUrl(existingArt || null);
      setFinalDataUrl(existingArt || null);
      setIsCreateMode(false);
      setZoom(1);
      setPan({ x: 0, y: 0 });
      setTool('brush');
      setPolygonPoints([]);
      tunedImgRef.current = null;

      if (existingTransform) {
        setArtTransform(existingTransform);
      } else {
        setArtTransform({
          x: SAFE_ZONE.focalX,
          y: SAFE_ZONE.focalY,
          scale: 60,
          rotation: 0,
        });
      }
    }
  }, [isOpen, existingArt, existingTransform]);

  // Cleanup webcam on unmount
  useEffect(() => {
    return () => {
      if (webcamStream) webcamStream.getTracks().forEach(t => t.stop());
    };
  }, [webcamStream]);

  // ─── Input handlers ────────────────────────────────────────────────────────

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      setIsCreateMode(false);
      setTool('brush');
      setRawDataUrl(evt.target.result);
      setDeskewedDataUrl(evt.target.result);
      setStage(1); // jump to deskew
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      setIsCreateMode(false);
      setTool('brush');
      setRawDataUrl(evt.target.result);
      setDeskewedDataUrl(evt.target.result);
      setStage(1);
    };
    reader.readAsDataURL(file);
  };

  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      setWebcamStream(stream);
      setShowWebcam(true);
      setTimeout(() => {
        if (videoRef.current) videoRef.current.srcObject = stream;
      }, 100);
    } catch {
      alert('Camera access denied or not available.');
    }
  };

  const captureWebcam = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext('2d').drawImage(videoRef.current, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    webcamStream?.getTracks().forEach(t => t.stop());
    setWebcamStream(null);
    setShowWebcam(false);
    setIsCreateMode(false);
    setTool('brush');
    setRawDataUrl(dataUrl);
    setDeskewedDataUrl(dataUrl);
    setStage(1);
  };

  const createBlankCanvas = () => {
    editedProcessedCanvasRef.current = null;
    const canvas = document.createElement('canvas');
    canvas.width = 1728;
    canvas.height = 2414;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/png');
    
    setIsCreateMode(true);
    setTool('brush');
    setRawDataUrl(dataUrl);
    setDeskewedDataUrl(dataUrl);
    setProcessedDataUrl(dataUrl);
    setTunedDataUrl(dataUrl);
    setFinalDataUrl(dataUrl);
    setStage(3); // Jump straight to drawing stage
  };

  // ─── Deskew (jscanify) ─────────────────────────────────────────────────────

  const runDeskew = useCallback(async () => {
    if (!rawDataUrl) return;
    try {
      const { default: jscanify } = await import('jscanify/client');
      const img = await loadImageFromDataUrl(rawDataUrl);
      const scanner = new jscanify();
      const srcCanvas = imageToCanvas(img, 1600);
      
      let resultWidth = srcCanvas.width;
      let resultHeight = srcCanvas.height;
      let maxContour = null;
      let isPaperContourValid = false;
      
      if (window.cv) {
        const cvImg = window.cv.imread(srcCanvas);
        maxContour = scanner.findPaperContour(cvImg);
        if (maxContour) {
          const contourArea = window.cv.contourArea(maxContour);
          const totalArea = srcCanvas.width * srcCanvas.height;
          const areaPct = contourArea / totalArea;
          
          if (areaPct >= 0.10 && areaPct <= 0.85) {
            const corners = scanner.getCornerPoints(maxContour, cvImg);
            if (corners.topLeftCorner && corners.topRightCorner && corners.bottomLeftCorner && corners.bottomRightCorner) {
              isPaperContourValid = true;
              const topWidth = Math.hypot(corners.topRightCorner.x - corners.topLeftCorner.x, corners.topRightCorner.y - corners.topLeftCorner.y);
              const bottomWidth = Math.hypot(corners.bottomRightCorner.x - corners.bottomLeftCorner.x, corners.bottomRightCorner.y - corners.bottomLeftCorner.y);
              const leftHeight = Math.hypot(corners.bottomLeftCorner.x - corners.topLeftCorner.x, corners.bottomLeftCorner.y - corners.topLeftCorner.y);
              const rightHeight = Math.hypot(corners.bottomRightCorner.x - corners.topRightCorner.x, corners.bottomRightCorner.y - corners.topRightCorner.y);
              
              resultWidth = Math.round(Math.max(topWidth, bottomWidth));
              resultHeight = Math.round(Math.max(leftHeight, rightHeight));
            }
          }
        }
        cvImg.delete();
      }
      
      if (resultWidth < 50 || resultHeight < 50) {
        resultWidth = srcCanvas.width;
        resultHeight = srcCanvas.height;
      }
      
      const result = isPaperContourValid ? scanner.extractPaper(srcCanvas, resultWidth, resultHeight) : null;
      if (!result) {
        setDeskewedDataUrl(rawDataUrl);
      } else {
        const url = canvasToDataUrl(result);
        setDeskewedDataUrl(url);
      }
    } catch (err) {
      console.warn('Deskew failed (jscanify), using original:', err.message);
      setDeskewedDataUrl(rawDataUrl);
    }
  }, [rawDataUrl]);

  // Auto-deskew when entering stage 1
  useEffect(() => {
    if (stage === 1 && rawDataUrl) {
      runDeskew();
    }
  }, [stage, rawDataUrl, runDeskew]);

  // ─── AI Processing pipeline ────────────────────────────────────────────────

  const markStep = (idx, status, pct = 0) => {
    setProgressSteps(prev => prev.map((s, i) =>
      i === idx ? { ...s, ...status, pct } : s
    ));
  };

  const runProcessingPipeline = async () => {
    if (!deskewedDataUrl) return;
    setProcessing(true);
    
    const steps = progressSteps;
    let currentDataUrl = deskewedDataUrl;

    try {
      // Step 1: Shadow Balance
      if (!steps[0].skip) {
        markStep(0, { active: true, done: false }, 0);
        currentDataUrl = await runPythonImageProcess('balance-lighting', currentDataUrl, (pct) => {
          markStep(0, { active: true }, pct);
        });
        markStep(0, { active: false, done: true }, 100);
      } else {
        markStep(0, { active: false, done: true, pct: 100 });
      }

      // Step 2: Line Art Enhancement
      if (!steps[1].skip) {
        markStep(1, { active: true, done: false }, 0);
        currentDataUrl = await runPythonImageProcess('enhance-lines', currentDataUrl, (pct) => {
          markStep(1, { active: true }, pct);
        });
        markStep(1, { active: false, done: true }, 100);
      } else {
        markStep(1, { active: false, done: true, pct: 100 });
      }

      // Step 3: AI Upscale (ESRGAN)
      if (!steps[2].skip) {
        markStep(2, { active: true, done: false }, 0);
        currentDataUrl = await upscaleImage(currentDataUrl, (pct) => {
          markStep(2, { active: true }, pct);
        });
        markStep(2, { active: false, done: true }, 100);
      } else {
        markStep(2, { active: false, done: true, pct: 100 });
      }

      // Step 4: AI Background Removal (RMBG-1.4)
      if (!steps[3].skip) {
        markStep(3, { active: true, done: false }, 0);
        currentDataUrl = await removeBackground(currentDataUrl, (pct) => {
          markStep(3, { active: true }, pct);
        });
        markStep(3, { active: false, done: true }, 100);
      } else {
        markStep(3, { active: false, done: true, pct: 100 });
      }

      setProcessedDataUrl(currentDataUrl);
      setFinalDataUrl(currentDataUrl);
      setProcessing(false);
      setStage(3); // advance to color tuning

    } catch (err) {
      setProcessing(false);
      alert('Processing error: ' + err.message);
    }
  };

  // ─── Color tuning ──────────────────────────────────────────────────────────

  const tuningDebounceRef = useRef(null);

  useEffect(() => {
    if (stage !== 3 || !processedDataUrl) return;
    
    if (isCreateMode) {
      setTunedDataUrl(processedDataUrl);
      setFinalDataUrl(processedDataUrl);
      return;
    }

    if (tuningDebounceRef.current) clearTimeout(tuningDebounceRef.current);
    tuningDebounceRef.current = setTimeout(async () => {
      const img = await loadImageFromDataUrl(processedDataUrl);
      const canvas = imageToCanvas(img, 1200);
      const enhanced = applyColorEnhancement(canvas, {
        vibrance: tuning.vibrance,
        familyTint: tuning.familyTint,
        familyHue: FAMILY_HUES[cardFamily] || 200,
        brightness: tuning.brightness,
        contrast: tuning.contrast,
        hueRotate: tuning.hueRotate,
      });
      setTunedDataUrl(canvasToDataUrl(enhanced));
      setFinalDataUrl(canvasToDataUrl(enhanced));
    }, 200);
  }, [tuning, processedDataUrl, stage, cardFamily, isCreateMode]);

  useEffect(() => {
    if (stage === 3 && processedDataUrl && !tunedDataUrl) {
      setTunedDataUrl(processedDataUrl);
      setFinalDataUrl(processedDataUrl);
    }
  }, [stage, processedDataUrl, tunedDataUrl]);

  useEffect(() => {
    if (tunedDataUrl) {
      loadImageFromDataUrl(tunedDataUrl).then(img => {
        tunedImgRef.current = img;
        if (previewCanvasRef.current) {
          const cvs = previewCanvasRef.current;
          cvs.width = img.width;
          cvs.height = img.height;
          const ctx = cvs.getContext('2d');
          ctx.clearRect(0, 0, cvs.width, cvs.height);
          ctx.drawImage(img, 0, 0);
        }
      });
    } else {
      tunedImgRef.current = null;
    }
  }, [tunedDataUrl]);

  // Brush Masking Initialization
  useEffect(() => {
    if (stage === 3 && processedDataUrl && !editedProcessedCanvasRef.current) {
      loadImageFromDataUrl(processedDataUrl).then(img => {
        editedProcessedCanvasRef.current = imageToCanvas(img, 1200);
      });
      if (deskewedDataUrl) {
        loadImageFromDataUrl(deskewedDataUrl).then(img => {
          originalImgRef.current = img;
        });
      }
    }
    if (stage !== 3) {
      editedProcessedCanvasRef.current = null;
      originalImgRef.current = null;
    }
  }, [stage, processedDataUrl, deskewedDataUrl, isCreateMode]);

  // Spacebar panning listeners
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Space' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        setPanMode(true);
        e.preventDefault();
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

  // Brush Drawing Actions
  const applyBrush = (x, y, lastX, lastY, displayWidth, displayHeight) => {
    if (!editedProcessedCanvasRef.current) return;
    const cvs = editedProcessedCanvasRef.current;
    const scaleX = cvs.width / displayWidth;
    const scaleY = cvs.height / displayHeight;
    const ctx = cvs.getContext('2d');
    
    ctx.save();
    if (tool === 'erase') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = brushSize * scaleX;
      ctx.beginPath();
      ctx.moveTo(lastX * scaleX, lastY * scaleY);
      ctx.lineTo(x * scaleX, y * scaleY);
      ctx.stroke();
    } else if (tool === 'restore' && originalImgRef.current) {
      const tempCvs = document.createElement('canvas');
      tempCvs.width = cvs.width;
      tempCvs.height = cvs.height;
      const tCtx = tempCvs.getContext('2d');
      tCtx.lineCap = 'round';
      tCtx.lineJoin = 'round';
      tCtx.lineWidth = brushSize * scaleX;
      tCtx.beginPath();
      tCtx.moveTo(lastX * scaleX, lastY * scaleY);
      tCtx.lineTo(x * scaleX, y * scaleY);
      tCtx.stroke();
      
      tCtx.globalCompositeOperation = 'source-in';
      tCtx.drawImage(originalImgRef.current, 0, 0, tempCvs.width, tempCvs.height);
      
      ctx.globalCompositeOperation = 'source-over';
      ctx.drawImage(tempCvs, 0, 0);
    } else if (tool === 'brush') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = strokeColor;
      ctx.globalAlpha = opacity;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = brushSize * scaleX;
      ctx.beginPath();
      ctx.moveTo(lastX * scaleX, lastY * scaleY);
      ctx.lineTo(x * scaleX, y * scaleY);
      ctx.stroke();
    }
    ctx.restore();
    
    if (previewCanvasRef.current) {
      const pCtx = previewCanvasRef.current.getContext('2d');
      pCtx.save();
      pCtx.lineCap = 'round';
      pCtx.lineJoin = 'round';
      pCtx.lineWidth = brushSize * scaleX;
      pCtx.beginPath();
      pCtx.moveTo(lastX * scaleX, lastY * scaleY);
      pCtx.lineTo(x * scaleX, y * scaleY);
      if (tool === 'erase') {
        pCtx.globalCompositeOperation = 'destination-out';
        pCtx.stroke();
      } else if (tool === 'restore') {
        pCtx.globalCompositeOperation = 'source-over';
        pCtx.strokeStyle = 'rgba(0, 255, 0, 0.4)';
        pCtx.stroke();
      } else if (tool === 'brush') {
        pCtx.globalCompositeOperation = 'source-over';
        pCtx.strokeStyle = strokeColor;
        pCtx.globalAlpha = opacity;
        pCtx.stroke();
      }
      pCtx.restore();
    }
  };

  const drawActivePreview = (currentX, currentY) => {
    if (!previewCanvasRef.current || !tunedImgRef.current) return;
    const cvs = previewCanvasRef.current;
    const ctx = cvs.getContext('2d');
    
    ctx.clearRect(0, 0, cvs.width, cvs.height);
    ctx.drawImage(tunedImgRef.current, 0, 0);

    if (isDrawingShape.current && startPosRef.current) {
      drawShape(ctx, tool, startPosRef.current, { x: currentX, y: currentY }, {
        strokeColor,
        fillColor,
        strokeEnabled,
        fillEnabled,
        brushSize,
        opacity,
        fontSize,
        textString,
        fontWeight
      });
    } else if (tool === 'polygon' && polygonPoints.length > 0) {
      ctx.save();
      ctx.globalAlpha = opacity;
      ctx.strokeStyle = strokeColor;
      ctx.fillStyle = fillColor;
      ctx.lineWidth = brushSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      ctx.moveTo(polygonPoints[0].x, polygonPoints[0].y);
      for (let i = 1; i < polygonPoints.length; i++) {
        ctx.lineTo(polygonPoints[i].x, polygonPoints[i].y);
      }
      ctx.lineTo(currentX, currentY);
      ctx.stroke();

      ctx.fillStyle = 'var(--color-primary)';
      for (let pt of polygonPoints) {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, Math.max(4, brushSize / 2), 0, 2 * Math.PI);
        ctx.fill();
      }
      ctx.restore();
    }
  };

  const commitPolygon = () => {
    if (polygonPoints.length < 2 || !editedProcessedCanvasRef.current) return;
    const cvs = editedProcessedCanvasRef.current;
    const ctx = cvs.getContext('2d');

    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.strokeStyle = strokeColor;
    ctx.fillStyle = fillColor;
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(polygonPoints[0].x, polygonPoints[0].y);
    for (let i = 1; i < polygonPoints.length; i++) {
      ctx.lineTo(polygonPoints[i].x, polygonPoints[i].y);
    }
    ctx.closePath();

    if (fillEnabled && polygonPoints.length >= 3) ctx.fill();
    if (strokeEnabled) ctx.stroke();
    ctx.restore();

    setPolygonPoints([]);
    setProcessedDataUrl(canvasToDataUrl(cvs));
  };

  const handleBrushDown = (e) => {
    if (tool === 'pan' || panMode || e.button === 1 || e.button === 2) return;
    if (!previewCanvasRef.current) return;
    
    const rect = previewCanvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const canvasX = (x / rect.width) * previewCanvasRef.current.width;
    const canvasY = (y / rect.height) * previewCanvasRef.current.height;

    if (tool === 'polygon') {
      if (polygonPoints.length >= 3) {
        const firstPt = polygonPoints[0];
        const dist = Math.sqrt((canvasX - firstPt.x) ** 2 + (canvasY - firstPt.y) ** 2);
        const closeThreshold = 15 * (previewCanvasRef.current.width / rect.width);
        if (dist < closeThreshold) {
          commitPolygon();
          return;
        }
      }
      setPolygonPoints(prev => [...prev, { x: canvasX, y: canvasY }]);
      return;
    }

    if (tool === 'text') {
      if (!editedProcessedCanvasRef.current) return;
      const cvs = editedProcessedCanvasRef.current;
      const ctx = cvs.getContext('2d');
      drawShape(ctx, 'text', { x: canvasX, y: canvasY }, { x: canvasX, y: canvasY }, {
        strokeColor,
        fillColor,
        strokeEnabled,
        fillEnabled,
        brushSize,
        opacity,
        fontSize,
        textString,
        fontWeight
      });
      setProcessedDataUrl(canvasToDataUrl(cvs));
      return;
    }

    if (['line', 'rect', 'circle'].includes(tool)) {
      isDrawingShape.current = true;
      startPosRef.current = { x: canvasX, y: canvasY };
      return;
    }

    isBrushing.current = true;
    brushLastPosRef.current = { x, y };
    applyBrush(x, y, x, y, rect.width, rect.height);
    e.preventDefault();
  };

  const handleBrushMove = (e) => {
    if (!previewCanvasRef.current) return;
    const rect = previewCanvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const canvasX = (x / rect.width) * previewCanvasRef.current.width;
    const canvasY = (y / rect.height) * previewCanvasRef.current.height;

    if (tool === 'polygon' && polygonPoints.length > 0) {
      drawActivePreview(canvasX, canvasY);
      return;
    }

    if (isDrawingShape.current && startPosRef.current) {
      drawActivePreview(canvasX, canvasY);
      return;
    }

    if (isBrushing.current && ['brush', 'erase', 'restore'].includes(tool)) {
      applyBrush(x, y, brushLastPosRef.current.x, brushLastPosRef.current.y, rect.width, rect.height);
      brushLastPosRef.current = { x, y };
    }
  };

  const handleBrushUp = (e) => {
    if (isDrawingShape.current && startPosRef.current && previewCanvasRef.current) {
      const rect = previewCanvasRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const canvasX = (x / rect.width) * previewCanvasRef.current.width;
      const canvasY = (y / rect.height) * previewCanvasRef.current.height;

      if (editedProcessedCanvasRef.current) {
        const cvs = editedProcessedCanvasRef.current;
        const ctx = cvs.getContext('2d');
        drawShape(ctx, tool, startPosRef.current, { x: canvasX, y: canvasY }, {
          strokeColor,
          fillColor,
          strokeEnabled,
          fillEnabled,
          brushSize,
          opacity,
          fontSize,
          textString,
          fontWeight
        });
        setProcessedDataUrl(canvasToDataUrl(cvs));
      }
      isDrawingShape.current = false;
      startPosRef.current = null;
    }

    if (isBrushing.current) {
      isBrushing.current = false;
      if (editedProcessedCanvasRef.current) {
        setProcessedDataUrl(canvasToDataUrl(editedProcessedCanvasRef.current));
      }
    }
  };

  // ─── Art placement (confirm stage) ────────────────────────────────────────

  const handleConfirm = () => {
    if (!finalDataUrl) return;
    onArtConfirmed({
      dataUrl: finalDataUrl,
      transform: artTransform
    });
    onClose();
  };

  const handleArtMouseDown = (e) => {
    isDraggingArt.current = true;
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      tx: artTransform.x,
      ty: artTransform.y
    };
    e.preventDefault();
  };

  useEffect(() => {
    const handleMove = (e) => {
      if (!isDraggingArt.current) return;
      const container = confirmCanvasRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const dx = ((e.clientX - dragStartRef.current.x) / rect.width) * 100;
      const dy = ((e.clientY - dragStartRef.current.y) / rect.height) * 100;
      setArtTransform(prev => ({
        ...prev,
        x: Math.max(5, Math.min(95, dragStartRef.current.tx + dx)),
        y: Math.max(5, Math.min(95, dragStartRef.current.ty + dy))
      }));
    };
    const handleUp = () => { isDraggingArt.current = false; };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [artTransform]);

  const handleStartOver = () => {
    if (window.confirm('Discard this artwork and start over?')) {
      setRawDataUrl(null);
      setDeskewedDataUrl(null);
      setProcessedDataUrl(null);
      setTunedDataUrl(null);
      setFinalDataUrl(null);
      setIsCreateMode(false);
      setStage(0);
    }
  };

  if (!isOpen) return null;

  const panelStyle = {
    position: 'fixed',
    inset: 0,
    zIndex: 1000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(0,0,0,0.75)',
    backdropFilter: 'blur(6px)',
  };

  const modalStyle = {
    background: 'var(--bg-surface)',
    border: '1px solid var(--border-color)',
    borderRadius: '16px',
    width: '900px',
    maxWidth: '95vw',
    maxHeight: '90vh',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
  };

  const stepBtnStyle = (active) => ({
    padding: '0.5rem 1rem',
    borderRadius: '8px',
    border: active ? '2px solid var(--color-primary)' : '2px solid transparent',
    background: active ? 'rgba(99,102,241,0.15)' : 'var(--bg-surface-elevated)',
    color: active ? 'white' : 'var(--text-muted)',
    fontSize: '0.75rem',
    fontWeight: 700,
    cursor: 'default',
    transition: 'all 0.2s',
    flexShrink: 0,
  });

  return (
    <div style={panelStyle} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={modalStyle}>

        {/* Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'var(--bg-surface-elevated)',
          flexShrink: 0,
        }}>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              🎨 {isComponentMode ? 'Component Art Integrator' : isTokenMode ? 'Token Art Integrator' : 'Art Integrator'}
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0' }}>
              {isComponentMode ? 'Scan, enhance, and place your custom art onto the component layer' : isTokenMode ? 'Scan, enhance, and place your custom art onto the token canvas' : 'Scan, enhance, and place your creature art onto the card'}
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
            <X size={22} />
          </button>
        </div>

        {/* Stage indicator */}
        <div style={{ display: 'flex', gap: '0.4rem', padding: '0.75rem 1.5rem', borderBottom: '1px solid var(--border-color)', overflowX: 'auto', flexShrink: 0, background: 'var(--bg-main)' }}>
          {(isComponentMode ? STAGE_LABELS_COMPONENT : isTokenMode ? STAGE_LABELS_TOKEN : STAGE_LABELS).map((label, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', flexShrink: 0 }}>
              <button style={stepBtnStyle(stage === i)}>
                {i < stage ? '✓ ' : ''}{label}
              </button>
              {i < STAGE_LABELS.length - 1 && <ChevronRight size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />}
            </div>
          ))}
        </div>

        {/* Stage Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: '1.5rem' }}>

          {/* ── Stage 0: Import ── */}
          {stage === 0 && (
            <Stage0Import
              showWebcam={showWebcam}
              setShowWebcam={setShowWebcam}
              videoRef={videoRef}
              fileInputRef={fileInputRef}
              handleFileUpload={handleFileUpload}
              handleDrop={handleDrop}
              startWebcam={startWebcam}
              captureWebcam={captureWebcam}
              webcamStream={webcamStream}
              createBlankCanvas={createBlankCanvas}
              onClose={onClose}
              isTokenMode={isTokenMode}
              isComponentMode={isComponentMode}
            />
          )}

          {/* ── Stage 1: Deskew ── */}
          {stage === 1 && (
            <Stage1Deskew
              rawDataUrl={rawDataUrl}
              deskewedDataUrl={deskewedDataUrl}
              runDeskew={runDeskew}
              setStage={setStage}
              setRawDataUrl={setRawDataUrl}
              setDeskewedDataUrl={setDeskewedDataUrl}
              setProcessedDataUrl={setProcessedDataUrl}
              setFinalDataUrl={setFinalDataUrl}
              setIsCreateMode={setIsCreateMode}
            />
          )}

          {/* ── Stage 2: AI Process ── */}
          {stage === 2 && (
            <Stage2Enhance
              processing={processing}
              progressSteps={progressSteps}
              setProgressSteps={setProgressSteps}
              runProcessingPipeline={runProcessingPipeline}
              setStage={setStage}
              setRawDataUrl={setRawDataUrl}
              setDeskewedDataUrl={setDeskewedDataUrl}
              setProcessedDataUrl={setProcessedDataUrl}
              setFinalDataUrl={setFinalDataUrl}
              setIsCreateMode={setIsCreateMode}
              cardName={cardName}
              cardCost={cardCost}
              cardEffect={cardEffect}
              cardFamily={cardFamily}
            />
          )}

          {/* ── Stage 3: Color Tune & Paint ── */}
          {stage === 3 && (
            <Stage3Paint
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
              opacity={opacity}
              setOpacity={setOpacity}
              fontSize={fontSize}
              setFontSize={setFontSize}
              textString={textString}
              setTextString={setTextString}
              polygonPoints={polygonPoints}
              setPolygonPoints={setPolygonPoints}
              fontWeight={fontWeight}
              setFontWeight={setFontWeight}
              isCreateMode={isCreateMode}
              createBlankCanvas={createBlankCanvas}
              brushSize={brushSize}
              setBrushSize={setBrushSize}
              zoom={zoom}
              handleZoomIn={handleZoomIn}
              handleZoomOut={handleZoomOut}
              handleZoomReset={handleZoomReset}
              pan={pan}
              isPanningState={isPanningState}
              panMode={panMode}
              setPanMode={setPanMode}
              canvasRef={previewCanvasRef}
              processedDataUrl={processedDataUrl}
              compareSlider={compareSlider}
              setCompareSlider={setCompareSlider}
              commitPolygon={commitPolygon}
              setStage={setStage}
              isTokenMode={isTokenMode}
              isComponentMode={isComponentMode}
              onPointerDown={(e) => {
                try {
                  e.currentTarget.setPointerCapture(e.pointerId);
                } catch (err) {}
                if (panMode || tool === 'pan' || e.button === 1 || e.button === 2) {
                  isPanning.current = true;
                  setIsPanningState(true);
                  lastPanPos.current = { x: e.clientX, y: e.clientY };
                  e.preventDefault();
                } else {
                  handleBrushDown(e);
                }
              }}
              onPointerMove={(e) => {
                if (isPanning.current) {
                  const dx = e.clientX - lastPanPos.current.x;
                  const dy = e.clientY - lastPanPos.current.y;
                  setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }));
                  lastPanPos.current = { x: e.clientX, y: e.clientY };
                } else {
                  handleBrushMove(e);
                }
              }}
              onPointerUp={(e) => {
                try {
                  e.currentTarget.releasePointerCapture(e.pointerId);
                } catch (err) {}
                if (isPanning.current) {
                  isPanning.current = false;
                  setIsPanningState(false);
                } else {
                  handleBrushUp(e);
                }
              }}
              onStartOver={handleStartOver}
              tuning={tuning}
              setTuning={setTuning}
            />
          )}

          {/* ── Stage 4: Place on Card/Token/Component ── */}
          {stage === 4 && (
            <Stage4Placement
              isComponentMode={isComponentMode}
              isTokenMode={isTokenMode}
              cardFamily={cardFamily}
              finalDataUrl={finalDataUrl}
              artTransform={artTransform}
              setArtTransform={setArtTransform}
              handleArtMouseDown={handleArtMouseDown}
              handleConfirm={handleConfirm}
              setStage={setStage}
              onStartOver={handleStartOver}
              confirmCanvasRef={confirmCanvasRef}
            />
          )}

        </div>
      </div>
    </div>
  );
}
