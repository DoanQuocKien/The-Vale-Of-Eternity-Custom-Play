import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Sliders, ImagePlus, Trash2, Copy, Download, Upload, Minimize2, Maximize2, HelpCircle, RefreshCw, Settings } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore.js';
import { 
  MOCK_PRESETS, 
  DEFAULT_LAYOUT, 
  RANDOM_NAMES, 
  RANDOM_CREDITS, 
  RANDOM_EFFECTS, 
  getBackgroundPath, 
  getTimingIcon, 
  getPriceColor, 
  parseEffectText, 
  getResolvedElementLayout 
} from '../../utils/constants.jsx';

const CardEditor = ({ onShowArtImporter }) => {
  const packs = useAppStore(state => state.packs);
  const activePackId = useAppStore(state => state.activePackId);
  const setActivePackId = useAppStore(state => state.setActivePackId);
  const saveCard = useAppStore(state => state.saveCard);
  const createNewPack = useAppStore(state => state.createNewPack);
  const activeCard = useAppStore(state => state.activeCard);
  const setActiveCard = useAppStore(state => state.setActiveCard);

  const [loadedCardId, setLoadedCardId] = useState(null);

  // Instead of using global store for draft, we use local state
  // to avoid lag when dragging or typing rapidly.
  const [activePreset, setActivePreset] = useState(MOCK_PRESETS[0]);
  const [backgroundFamily, setBackgroundFamily] = useState('Water');
  const [cardName, setCardName] = useState(MOCK_PRESETS[0].name);
  const [cardCost, setCardCost] = useState(MOCK_PRESETS[0].cost);
  const [cardCredit, setCardCredit] = useState(MOCK_PRESETS[0].credit);
  const [cardEffectText, setCardEffectText] = useState(MOCK_PRESETS[0].effect);
  const [artImageData, setArtImageData] = useState(null);
  const [layout, setLayout] = useState(DEFAULT_LAYOUT);
  const [selectedElement, setSelectedElement] = useState('name');
  const [zoomScale, setZoomScale] = useState(0.85);
  const [jsonInput, setJsonInput] = useState('');
  
  // Expose the current state so parent can handle ArtImporter logic
  // We'll manage artImageData locally but we need the ArtImporter to be aware.
  // We can listen to a custom event or pass down a ref. But for now, we'll assume 
  // the parent can push art data if we add an effect. Actually, `App.jsx` can pass `draftCard` state down 
  // or `CardEditor` can manage its own artImporter. 
  // For simplicity, let's keep ArtImporter in CardEditor and open it from here!
  // But wait, the task was just to extract the component.

  const cardRef = useRef(null);

  // Sync state if an external card is loaded
  useEffect(() => {
    if (activeCard) {
      if (activeCard.id !== loadedCardId) {
        setCardName(activeCard.name || '');
        setCardCost(activeCard.cost || '0');
        setCardCredit(activeCard.credit || '');
        setCardEffectText(activeCard.effect || '');
        setBackgroundFamily(activeCard.family || 'Water');
        setArtImageData(activeCard.artImageData || null);
        setLayout(activeCard.layout || DEFAULT_LAYOUT);
        setLoadedCardId(activeCard.id);
      }
    } else if (loadedCardId !== null) {
      // Clear/Reset back to defaults
      setCardName(MOCK_PRESETS[0].name);
      setCardCost(MOCK_PRESETS[0].cost);
      setCardCredit(MOCK_PRESETS[0].credit);
      setCardEffectText(MOCK_PRESETS[0].effect);
      setBackgroundFamily(MOCK_PRESETS[0].family);
      setArtImageData(null);
      setLayout(DEFAULT_LAYOUT);
      setLoadedCardId(null);
    }
  }, [activeCard, loadedCardId]);

  const loadPreset = (preset) => {
    setActiveCard(null); // Clear editing card context
    setActivePreset(preset);
    setCardName(preset.name);
    setCardCost(preset.cost);
    setCardCredit(preset.credit);
    setCardEffectText(preset.effect);
    setBackgroundFamily(preset.family);
    setArtImageData(null);
    setLayout(DEFAULT_LAYOUT);
  };

  const generateRandomCard = () => {
    setActiveCard(null); // Clear editing card context on random generation
    const name = RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)];
    const cost = Math.floor(Math.random() * 10).toString();
    const credit = RANDOM_CREDITS[Math.floor(Math.random() * RANDOM_CREDITS.length)];
    const effect = RANDOM_EFFECTS[Math.floor(Math.random() * RANDOM_EFFECTS.length)];
    const families = ['Fire', 'Water', 'Earth', 'Wind', 'Dragon'];
    const family = families[Math.floor(Math.random() * families.length)];
    
    setCardName(name);
    setCardCost(cost);
    setCardCredit(credit);
    setCardEffectText(effect);
    setBackgroundFamily(family);
    setArtImageData(null);
    setLayout(DEFAULT_LAYOUT);
  };

  const handleSaveCard = async (saveAsNew = false) => {
    const isNew = saveAsNew || !activeCard;
    const cardId = isNew ? 'card-' + Date.now() : activeCard.id;
    const newCard = {
      id: cardId,
      packId: activePackId,
      name: cardName,
      cost: cardCost,
      family: backgroundFamily,
      credit: cardCredit,
      effect: cardEffectText,
      layout: layout,
      artImageData: artImageData || null,
      createdAt: isNew ? Date.now() : activeCard.createdAt,
      updatedAt: Date.now()
    };
    try {
      await saveCard(newCard);
      setLoadedCardId(cardId);
      alert(isNew ? 'Card saved as new card!' : 'Card updated successfully!');
    } catch (err) {
      alert('Error saving card: ' + err.message);
    }
  };

  const handleDragStart = (e, elementKey) => {
    e.preventDefault();
    setSelectedElement(elementKey);
    
    const cardElement = cardRef.current;
    if (!cardElement) return;
    
    const cardRect = cardElement.getBoundingClientRect();
    const startX = e.clientX;
    const startY = e.clientY;
    
    const currentLayout = getResolvedElementLayout(elementKey, backgroundFamily, layout);
    const startLeft = currentLayout.left ?? 0;
    const startTop = currentLayout.top ?? 0;
    
    const handleDragMove = (moveEvent) => {
      if (elementKey === 'effectIcon') {
        const cqwPx = cardRect.width / 100;
        const deltaX = (moveEvent.clientX - startX) / cqwPx;
        const deltaY = (moveEvent.clientY - startY) / cqwPx;
        
        setLayout(prev => ({
          ...prev,
          effectIcon: {
            ...prev.effectIcon,
            left: parseFloat((startLeft + deltaX).toFixed(1)),
            top: parseFloat((startTop + deltaY).toFixed(1))
          }
        }));
        return;
      }
      
      const familySpecificKeys = ['priceTL', 'priceBR', 'credit'];
      if (familySpecificKeys.includes(elementKey)) {
        const deltaX = moveEvent.clientX - startX;
        const deltaY = moveEvent.clientY - startY;
        
        const percentDeltaX = (deltaX / cardRect.width) * 100;
        const percentDeltaY = (deltaY / cardRect.height) * 100;
        
        const percentX = parseFloat(Math.max(0, Math.min(100, startLeft + percentDeltaX)).toFixed(1));
        const percentY = parseFloat(Math.max(0, Math.min(100, startTop + percentDeltaY)).toFixed(1));

        setLayout(prev => {
          const selected = prev[elementKey];
          const currentFamilies = selected.families || {};
          const activeFamilyLayout = currentFamilies[backgroundFamily] || {
            left: selected.left,
            top: selected.top,
            fontSize: selected.fontSize,
            width: selected.width
          };
          return {
            ...prev,
            [elementKey]: {
              ...selected,
              families: {
                ...currentFamilies,
                [backgroundFamily]: {
                  ...activeFamilyLayout,
                  left: percentX,
                  top: percentY
                }
              }
            }
          };
        });
        return;
      }
      
      const deltaX = moveEvent.clientX - cardRect.left;
      const deltaY = moveEvent.clientY - cardRect.top;
      
      const percentX = parseFloat(Math.max(0, Math.min(100, (deltaX / cardRect.width) * 100)).toFixed(1));
      const percentY = parseFloat(Math.max(0, Math.min(100, (deltaY / cardRect.height) * 100)).toFixed(1));
      
      setLayout(prev => ({
        ...prev,
        [elementKey]: {
          ...prev[elementKey],
          left: percentX,
          top: percentY
        }
      }));
    };
    
    const handleDragEnd = () => {
      document.removeEventListener('mousemove', handleDragMove);
      document.removeEventListener('mouseup', handleDragEnd);
    };
    
    document.addEventListener('mousemove', handleDragMove);
    document.addEventListener('mouseup', handleDragEnd);
  };

  const updateSetting = (key, value, elementKey = selectedElement) => {
    setLayout(prev => {
      const selected = prev[elementKey];
      const familySpecificKeys = ['priceTL', 'priceBR', 'credit'];
      
      if (familySpecificKeys.includes(elementKey)) {
        if (key === 'color') {
          const currentColors = selected.colors || {
            Fire: 'default',
            Water: 'default',
            Earth: 'default',
            Wind: 'default',
            Dragon: 'default'
          };
          return {
            ...prev,
            [elementKey]: {
              ...selected,
              color: 'default',
              colors: {
                ...currentColors,
                [backgroundFamily]: value
              }
            }
          };
        }
        
        const currentFamilies = selected.families || {};
        const activeFamilyLayout = currentFamilies[backgroundFamily] || {
          left: selected.left,
          top: selected.top,
          fontSize: selected.fontSize,
          width: selected.width
        };
        
        return {
          ...prev,
          [elementKey]: {
            ...selected,
            families: {
              ...currentFamilies,
              [backgroundFamily]: {
                ...activeFamilyLayout,
                [key]: value
              }
            }
          }
        };
      }
      return {
        ...prev,
        [elementKey]: {
          ...selected,
          [key]: value
        }
      };
    });
  };

  const copyLayoutToClipboard = () => {
    navigator.clipboard.writeText(JSON.stringify(layout, null, 2));
    alert('Configuration JSON copied to clipboard!');
  };

  const importLayoutConfig = () => {
    try {
      const parsed = JSON.parse(jsonInput);
      if (parsed.priceTL && parsed.priceBR && parsed.name && parsed.effect && parsed.credit) {
        if (!parsed.effectIcon) {
          parsed.effectIcon = {
            left: parsed.effect?.iconOffsetLeft ?? 0,
            top: parsed.effect?.iconOffset ?? 0.2,
            size: parsed.effect?.iconSize ?? 6.0,
            gap: parsed.effect?.iconGap ?? 1.5
          };
        }
        
        const familiesList = ['Fire', 'Water', 'Earth', 'Wind', 'Dragon'];
        ['priceTL', 'priceBR', 'credit'].forEach(key => {
          if (parsed[key] && !parsed[key].families) {
            parsed[key].families = {};
            familiesList.forEach(fam => {
              parsed[key].families[fam] = {
                left: parsed[key].left,
                top: parsed[key].top,
                fontSize: parsed[key].fontSize,
                width: parsed[key].width
              };
            });
          }
        });

        if (parsed.effect) {
          if (parsed.effect.panelHeight === undefined) parsed.effect.panelHeight = 8.5;
          if (parsed.effect.panelGap === undefined) parsed.effect.panelGap = 1.5;
          if (parsed.effect.textLeft === undefined) parsed.effect.textLeft = 10.0;
          if (parsed.effect.textTop === undefined) parsed.effect.textTop = 1.5;
          if (parsed.effect.textWidth === undefined) parsed.effect.textWidth = 80;
          if (parsed.effect.textHeight === undefined) parsed.effect.textHeight = 70;
        }

        setLayout(parsed);
        alert('Configuration imported successfully!');
      } else {
        alert('Invalid JSON layout structure. Make sure all components are defined.');
      }
    } catch (e) {
      alert('Error parsing JSON string. Please verify layout format.');
    }
  };

  const insertTextTag = (tag) => {
    setCardEffectText(prev => prev + tag);
  };

  const renderEffectPanels = () => {
    const lines = cardEffectText.split('\n');
    
    const iconSize = layout.effectIcon?.size ?? layout.effect?.iconSize ?? 6.0;
    const iconOffset = layout.effectIcon?.top ?? layout.effect?.iconOffset ?? 0.2;
    const iconLeft = layout.effectIcon?.left ?? 0;

    const panelHeight = layout.effect.panelHeight ?? 8.5;
    const panelGap = layout.effect.panelGap ?? 1.5;
    const textLeft = layout.effect.textLeft ?? 10.0;
    const textTop = layout.effect.textTop ?? 1.5;
    const textWidth = layout.effect.textWidth ?? 80;
    const textHeight = layout.effect.textHeight ?? 70;

    return lines.map((line, idx) => {
      if (!line.trim()) return null;
      
      const { icon, text } = getTimingIcon(line);
      
      return (
        <div key={idx} style={{
          position: 'relative',
          width: '100%',
          height: `${panelHeight}cqw`,
          marginBottom: idx < lines.length - 1 ? `${panelGap}cqw` : 0
        }}>
          <div style={{
            width: '100%',
            height: '100%',
            background: `rgba(${parseInt(layout.effect.bgColor.slice(1, 3), 16)}, ${parseInt(layout.effect.bgColor.slice(3, 5), 16)}, ${parseInt(layout.effect.bgColor.slice(5, 7), 16)}, ${layout.effect.bgOpacity})`,
            color: layout.effect.color,
            fontSize: `${layout.effect.fontSize}cqw`,
            fontFamily: 'var(--font-effect)',
            borderRadius: `${layout.effect.borderRadius}cqw`,
            borderLeft: `2.5px solid var(--family-${backgroundFamily.toLowerCase()})`,
            boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
            position: 'relative',
            boxSizing: 'border-box'
          }}>
            <div style={{
              position: 'absolute',
              left: `${textLeft}cqw`,
              top: `${textTop}cqw`,
              width: `${textWidth}%`,
              height: `${textHeight}%`,
              textAlign: 'left',
              lineHeight: 1.35,
              boxSizing: 'border-box',
              overflow: 'visible'
            }}>
              {parseEffectText(text)}
            </div>
          </div>

          {icon && (
            <img 
              src={icon} 
              alt="Timing" 
              onMouseDown={(e) => {
                e.stopPropagation();
                handleDragStart(e, 'effectIcon');
              }}
              style={{
                position: 'absolute',
                left: `${iconLeft}cqw`,
                top: `${iconOffset}cqw`,
                width: `${iconSize}cqw`,
                height: `${iconSize}cqw`,
                objectFit: 'contain',
                cursor: 'move',
                border: selectedElement === 'effectIcon' ? '1.5px dashed var(--color-primary)' : '1.5px dashed transparent',
                borderRadius: '4px',
                padding: '1px',
                zIndex: 5
              }}
            />
          )}
        </div>
      );
    });
  };

  const resolvedPriceTL = getResolvedElementLayout('priceTL', backgroundFamily, layout);
  const resolvedPriceBR = getResolvedElementLayout('priceBR', backgroundFamily, layout);
  const resolvedCredit = getResolvedElementLayout('credit', backgroundFamily, layout);
  const resolvedSelected = getResolvedElementLayout(selectedElement, backgroundFamily, layout);

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1.1fr 0.9fr',
      gap: '2rem',
      marginTop: '1rem',
      alignItems: 'start'
    }}>
      {/* LEFT COMPONENT: The interactive card workspace */}
      <div className="glass-panel" style={{
        padding: '2rem',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'sticky',
        top: '2rem',
        minHeight: '720px',
        background: 'rgba(5, 8, 20, 0.5)'
      }}>
        <div style={{
          position: 'absolute',
          top: '1rem',
          right: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          background: 'var(--bg-surface-elevated)',
          padding: '0.3rem 0.6rem',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-color)',
          zIndex: 10
        }}>
          <button 
            onClick={() => setZoomScale(s => Math.max(0.5, s - 0.05))}
            style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          >
            <Minimize2 size={16} />
          </button>
          <span style={{ fontSize: '0.8rem', width: '35px', textAlign: 'center', fontWeight: 600 }}>
            {Math.round(zoomScale * 100)}%
          </span>
          <button 
            onClick={() => setZoomScale(s => Math.min(1.5, s + 0.05))}
            style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          >
            <Maximize2 size={16} />
          </button>
        </div>

        <div style={{
          position: 'absolute',
          top: '1rem',
          left: '1rem',
          fontSize: '0.8rem',
          color: 'var(--text-secondary)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem'
        }}>
          <HelpCircle size={14} /> Drag elements directly on the card to reposition them.
        </div>

        <div 
          ref={cardRef}
          style={{
            position: 'relative',
            width: '450px',
            height: '628px',
            background: '#030712',
            borderRadius: '26px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
            overflow: 'hidden',
            transform: `scale(${zoomScale})`,
            transformOrigin: 'center center',
            transition: 'transform 0.1s ease-out',
            containerType: 'inline-size'
          }}
        >
          <img 
            src={getBackgroundPath(backgroundFamily)} 
            alt="Card Background" 
            style={{ width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }}
          />

          {artImageData?.dataUrl && (
            <img
              src={artImageData.dataUrl}
              alt="Card Art"
              style={{
                position: 'absolute',
                left: `${artImageData.transform?.x ?? 50}%`,
                top: `${artImageData.transform?.y ?? 47.7}%`,
                width: `${artImageData.transform?.scale ?? 60}%`,
                transform: `translate(-50%, -50%) rotate(${artImageData.transform?.rotation ?? 0}deg)`,
                pointerEvents: 'none',
                zIndex: 1,
                userSelect: 'none',
              }}
              draggable={false}
            />
          )}

          <div 
            onMouseDown={(e) => handleDragStart(e, 'priceTL')}
            style={{
              position: 'absolute',
              left: `${resolvedPriceTL.left}%`,
              top: `${resolvedPriceTL.top}%`,
              fontSize: `${resolvedPriceTL.fontSize}cqw`,
              fontFamily: 'var(--font-price)',
              color: getPriceColor('priceTL', backgroundFamily, layout),
              lineHeight: 1,
              cursor: 'move',
              userSelect: 'none',
              padding: '4px',
              border: selectedElement === 'priceTL' ? '1.5px dashed var(--color-primary)' : '1.5px dashed transparent',
              borderRadius: '4px',
              transform: 'translate(-50%, -50%)',
              zIndex: selectedElement === 'priceTL' ? 10 : 2,
              textShadow: '0 2px 4px rgba(0,0,0,0.8)'
            }}
          >
            {cardCost}
          </div>

          <div 
            onMouseDown={(e) => handleDragStart(e, 'priceBR')}
            style={{
              position: 'absolute',
              left: `${resolvedPriceBR.left}%`,
              top: `${resolvedPriceBR.top}%`,
              fontSize: `${resolvedPriceBR.fontSize}cqw`,
              fontFamily: 'var(--font-price)',
              color: getPriceColor('priceBR', backgroundFamily, layout),
              lineHeight: 1,
              cursor: 'move',
              userSelect: 'none',
              padding: '4px',
              border: selectedElement === 'priceBR' ? '1.5px dashed var(--color-primary)' : '1.5px dashed transparent',
              borderRadius: '4px',
              transform: 'translate(-50%, -50%)',
              zIndex: selectedElement === 'priceBR' ? 10 : 2,
              textShadow: '0 2px 4px rgba(0,0,0,0.8)'
            }}
          >
            {cardCost}
          </div>

          <div 
            onMouseDown={(e) => handleDragStart(e, 'name')}
            style={{
              position: 'absolute',
              left: `${layout.name.left}%`,
              top: `${layout.name.top}%`,
              width: `${layout.name.width}%`,
              fontSize: `${layout.name.fontSize}cqw`,
              fontFamily: 'var(--font-card-name)',
              color: layout.name.color,
              fontWeight: 'normal',
              textAlign: 'center',
              cursor: 'move',
              userSelect: 'none',
              padding: '4px',
              border: selectedElement === 'name' ? '1.5px dashed var(--color-primary)' : '1.5px dashed transparent',
              borderRadius: '4px',
              transform: 'translate(0, -50%)',
              zIndex: selectedElement === 'name' ? 10 : 2,
              letterSpacing: '0.02em',
              textShadow: '0 2px 8px rgba(0, 0, 0, 0.9), 0 0 12px rgba(0, 0, 0, 0.7)'
            }}
          >
            {cardName}
          </div>

          <div 
            onMouseDown={(e) => handleDragStart(e, 'effect')}
            style={{
              position: 'absolute',
              left: `${layout.effect.left}%`,
              top: `${layout.effect.top}%`,
              width: `${layout.effect.width}%`,
              cursor: 'move',
              userSelect: 'none',
              padding: '0px',
              border: selectedElement === 'effect' ? '1.5px dashed var(--color-primary)' : '1.5px dashed transparent',
              borderRadius: '8px',
              zIndex: selectedElement === 'effect' ? 10 : 2,
              display: 'flex',
              flexDirection: 'column',
              boxSizing: 'border-box'
            }}
          >
            {renderEffectPanels()}
          </div>

          <div 
            onMouseDown={(e) => handleDragStart(e, 'credit')}
            style={{
              position: 'absolute',
              left: `${resolvedCredit.left}%`,
              top: `${resolvedCredit.top}%`,
              width: `${resolvedCredit.width}%`,
              fontSize: `${resolvedCredit.fontSize}cqw`,
              fontFamily: 'var(--font-credit)',
              color: getPriceColor('credit', backgroundFamily, layout),
              textAlign: 'center',
              cursor: 'move',
              userSelect: 'none',
              padding: '4px',
              border: selectedElement === 'credit' ? '1.5px dashed var(--color-primary)' : '1.5px dashed transparent',
              borderRadius: '4px',
              transform: 'translate(0, -50%)',
              zIndex: selectedElement === 'credit' ? 10 : 2,
              textShadow: '0 1px 3px rgba(0,0,0,0.8)'
            }}
          >
            {cardCredit}
          </div>
        </div>
      </div>

      {/* RIGHT COMPONENT: Calibration Settings Sidebar */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        {/* Section 1: Template and Text Inputs */}
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#818cf8', display: 'flex', alignItems: 'center', gap: '0.4rem', margin: 0 }}>
              <Sparkles size={16} /> 1. Edit Card Content
            </h3>
            <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
              {activeCard && (
                <button
                  onClick={() => {
                    if (window.confirm('Clear editing context and start creating a new card?')) {
                      setActiveCard(null);
                    }
                  }}
                  style={{
                    padding: '0.35rem 0.6rem',
                    background: 'rgba(99, 102, 241, 0.15)',
                    border: '1px solid var(--color-primary)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    color: 'var(--text-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    transition: 'all 0.2s'
                  }}
                  title="Create a new card from scratch"
                >
                  ➕ New Card
                </button>
              )}
              <button
                onClick={generateRandomCard}
                style={{
                  padding: '0.35rem 0.6rem',
                  background: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  color: 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  transition: 'all 0.2s'
                }}
                title="Generate a random card"
              >
                🎲 Random Card
              </button>
              {artImageData ? (
                <>
                  <button
                    onClick={() => onShowArtImporter({ family: backgroundFamily, existingArt: artImageData.dataUrl }, setArtImageData)}
                    style={{
                      padding: '0.35rem 0.6rem',
                      background: 'rgba(236,72,153,0.15)',
                      border: '1px solid var(--color-primary)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      color: '#f472b6',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      transition: 'all 0.2s'
                    }}
                    title="Adjust position, scale or drawing layers of existing art"
                  >
                    <Sliders size={12} />
                    Edit Position
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm('Discard existing artwork and import/sketch a new one?')) {
                        setArtImageData(null);
                        onShowArtImporter({ family: backgroundFamily, existingArt: null }, setArtImageData);
                      }
                    }}
                    style={{
                      padding: '0.35rem 0.6rem',
                      background: 'var(--bg-surface-elevated)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      color: 'var(--text-secondary)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      transition: 'all 0.2s'
                    }}
                    title="Start a new artwork (upload or sketch)"
                  >
                    <ImagePlus size={12} />
                    New Art
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm('Delete the custom artwork for this card?')) {
                        setArtImageData(null);
                      }
                    }}
                    style={{
                      padding: '0.35rem 0.5rem',
                      background: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid var(--color-danger)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      color: 'var(--color-danger)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s'
                    }}
                    title="Remove custom artwork"
                  >
                    <Trash2 size={12} />
                  </button>
                </>
              ) : (
                <button
                  onClick={() => onShowArtImporter({ family: backgroundFamily, existingArt: null }, setArtImageData)}
                  style={{
                    padding: '0.35rem 0.75rem',
                    background: 'var(--bg-surface-elevated)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    color: 'var(--text-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    transition: 'all 0.2s'
                  }}
                >
                  <ImagePlus size={13} />
                  Add Art
                </button>
              )}
            </div>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Family</label>
              <select
                value={backgroundFamily}
                onChange={(e) => setBackgroundFamily(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.4rem 0.6rem',
                  background: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.85rem'
                }}
              >
                {['Fire', 'Water', 'Earth', 'Wind', 'Dragon'].map(f => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>

            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Card Name</label>
              <input
                type="text"
                value={cardName}
                onChange={(e) => setCardName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.4rem 0.6rem',
                  background: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.85rem'
                }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Price (Cost)</label>
              <input
                type="number"
                min="0"
                max="99"
                value={cardCost}
                onChange={(e) => setCardCost(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.4rem 0.6rem',
                  background: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.85rem'
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Artist Credit</label>
              <input
                type="text"
                value={cardCredit}
                onChange={(e) => setCardCredit(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.4rem 0.6rem',
                  background: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.85rem'
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '0.5rem' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
              Effect Description (Split timing with newline `\n`)
            </label>
            <textarea
              value={cardEffectText}
              onChange={(e) => setCardEffectText(e.target.value)}
              rows="3"
              style={{
                width: '100%',
                padding: '0.5rem 0.6rem',
                background: 'var(--bg-surface-elevated)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.85rem',
                fontFamily: 'monospace',
                lineHeight: '1.4',
                resize: 'vertical'
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>Insert:</span>
            {[
              { label: '⚡', tag: '⚡ ' },
              { label: '♾️', tag: '♾️ ' },
              { label: '⏳', tag: '⏳ ' },
              { label: 'Water', tag: '\\icon(Water)' },
              { label: 'Fire', tag: '\\icon(Fire)' },
              { label: 'Wind', tag: '\\icon(Wind)' },
              { label: 'Earth', tag: '\\icon(Earth)' },
              { label: 'Dragon', tag: '\\icon(Dragon)' },
              { label: 'Red St.', tag: '\\icon(Stone1)' },
              { label: 'Blue St.', tag: '\\icon(Stone3)' },
              { label: 'Purp. St.', tag: '\\icon(Stone6)' },
              { label: 'VP', tag: '\\icon(Score, 1)' },
              { label: 'Italic', tag: '\\italic(text)' }
            ].map(t => (
              <button
                key={t.label}
                onClick={() => insertTextTag(t.tag)}
                style={{
                  padding: '0.15rem 0.4rem',
                  background: 'var(--bg-main)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.7rem',
                  cursor: 'pointer',
                  color: 'var(--text-secondary)'
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div style={{
            marginTop: '1rem',
            paddingTop: '1rem',
            borderTop: '1px dashed var(--border-color)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem'
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '0.5rem', alignItems: 'center' }}>
              <div>
                <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.15rem', fontWeight: 600 }}>Target Pack</label>
                <select
                  value={activePackId}
                  onChange={(e) => setActivePackId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.35rem 0.5rem',
                    background: 'var(--bg-main)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.8rem'
                  }}
                >
                  {packs.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              
              <div style={{ alignSelf: 'end' }}>
                <button
                  onClick={async () => {
                    const name = window.prompt('Enter new pack name:');
                    if (name && name.trim()) {
                      await createNewPack(name.trim());
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '0.35rem 0.5rem',
                    background: 'var(--bg-surface-elevated)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    color: 'var(--text-secondary)'
                  }}
                >
                  + New Pack
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={() => handleSaveCard(false)}
                style={{
                  flexGrow: 1,
                  padding: '0.6rem 1rem',
                  background: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--color-primary)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text-primary)',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                  transition: 'all 0.2s'
                }}
              >
                💾 Save/Overwrite Card
              </button>
              <button
                onClick={() => handleSaveCard(true)}
                style={{
                  flexGrow: 1,
                  padding: '0.6rem 1rem',
                  background: 'linear-gradient(135deg, var(--color-primary), #8b5cf6)',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  color: 'white',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                  boxShadow: '0 4px 12px rgba(99, 102, 241, 0.2)',
                  transition: 'all 0.2s'
                }}
              >
                ✨ Save as New Card
              </button>
            </div>
          </div>
        </div>

        {/* Section 2: Element Properties Calibration Sidebar */}
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.75rem', color: '#a78bfa', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Settings size={16} /> 2. Layout & Typography Calibration
          </h3>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            Select an element on the card to fine-tune its position, size, and styling properties.
          </p>

          <div style={{ display: 'flex', gap: '0.2rem', marginBottom: '1rem', background: 'var(--bg-surface-elevated)', padding: '0.2rem', borderRadius: 'var(--radius-sm)' }}>
            {[
              { id: 'price', label: 'Cost' },
              { id: 'name', label: 'Title' },
              { id: 'effect', label: 'Effect Box' },
              { id: 'credit', label: 'Credit' }
            ].map(tab => {
              const isActive = tab.id === 'price'
                ? ['priceTL', 'priceBR'].includes(selectedElement)
                : tab.id === 'effect'
                  ? ['effect', 'effectIcon'].includes(selectedElement)
                  : selectedElement === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setSelectedElement(tab.id === 'price' ? 'priceTL' : tab.id)}
                  style={{
                    flex: 1,
                    padding: '0.35rem 0.2rem',
                    background: isActive ? 'var(--color-primary)' : 'transparent',
                    border: 'none',
                    borderRadius: '4px',
                    color: isActive ? 'white' : 'var(--text-secondary)',
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {['priceTL', 'priceBR'].includes(selectedElement) ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(56, 189, 248, 0.1)', padding: '0.4rem 0.6rem', borderRadius: '4px', borderLeft: '2px solid #38bdf8' }}>
                <span style={{ fontSize: '0.7rem', color: '#38bdf8' }}>ℹ️ Calibrating for <strong style={{ color: 'white' }}>{backgroundFamily}</strong> family only.</span>
              </div>

              {/* Single Shared Color Control for both tags */}
              <div style={{ background: 'var(--bg-surface-elevated)', padding: '0.85rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                  <span>Shared Cost Tags Color</span>
                  <span>{backgroundFamily} Theme</span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <input
                    type="color"
                    value={resolvedPriceTL.colors?.[backgroundFamily] && resolvedPriceTL.colors[backgroundFamily] !== 'default' ? resolvedPriceTL.colors[backgroundFamily] : (resolvedPriceTL.color || '#ffffff')}
                    onChange={(e) => {
                      updateSetting('color', e.target.value, 'priceTL');
                      updateSetting('color', e.target.value, 'priceBR');
                    }}
                    style={{
                      flexGrow: 1,
                      height: '30px',
                      padding: '0',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-sm)',
                      background: 'transparent',
                      cursor: 'pointer'
                    }}
                  />
                  <button
                    onClick={() => {
                      updateSetting('color', 'default', 'priceTL');
                      updateSetting('color', 'default', 'priceBR');
                    }}
                    style={{
                      padding: '0.35rem 0.5rem',
                      background: 'var(--bg-main)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--text-secondary)',
                      fontSize: '0.65rem',
                      cursor: 'pointer'
                    }}
                  >
                    Reset Default
                  </button>
                </div>
              </div>

              {/* Panel 1: Top-Left Price Tag */}
              <div style={{ background: 'var(--bg-surface-elevated)', padding: '0.85rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                <h4 style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.6rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Top-Left Cost Tag</span>
                  {selectedElement === 'priceTL' && <span style={{ fontSize: '0.65rem', color: 'var(--color-primary)', fontWeight: 600 }}>● Editing</span>}
                </h4>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                      <span>Pos X</span>
                      <span>{resolvedPriceTL.left}%</span>
                    </div>
                    <input
                      type="range"
                      min="-10"
                      max="110"
                      step="0.1"
                      value={resolvedPriceTL.left}
                      onChange={(e) => updateSetting('left', parseFloat(e.target.value), 'priceTL')}
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                      <span>Pos Y</span>
                      <span>{resolvedPriceTL.top}%</span>
                    </div>
                    <input
                      type="range"
                      min="-10"
                      max="110"
                      step="0.1"
                      value={resolvedPriceTL.top}
                      onChange={(e) => updateSetting('top', parseFloat(e.target.value), 'priceTL')}
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                      <span>Size</span>
                      <span>{resolvedPriceTL.fontSize}</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="30"
                      step="0.1"
                      value={resolvedPriceTL.fontSize ?? 5}
                      onChange={(e) => updateSetting('fontSize', parseFloat(e.target.value), 'priceTL')}
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>
              </div>

              {/* Panel 2: Bottom-Right Price Tag */}
              <div style={{ background: 'var(--bg-surface-elevated)', padding: '0.85rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                <h4 style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.6rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Bottom-Right Cost Tag</span>
                  {selectedElement === 'priceBR' && <span style={{ fontSize: '0.65rem', color: 'var(--color-primary)', fontWeight: 600 }}>● Editing</span>}
                </h4>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                      <span>Pos X</span>
                      <span>{resolvedPriceBR.left}%</span>
                    </div>
                    <input
                      type="range"
                      min="-10"
                      max="110"
                      step="0.1"
                      value={resolvedPriceBR.left}
                      onChange={(e) => updateSetting('left', parseFloat(e.target.value), 'priceBR')}
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                      <span>Pos Y</span>
                      <span>{resolvedPriceBR.top}%</span>
                    </div>
                    <input
                      type="range"
                      min="-10"
                      max="110"
                      step="0.1"
                      value={resolvedPriceBR.top}
                      onChange={(e) => updateSetting('top', parseFloat(e.target.value), 'priceBR')}
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                      <span>Size</span>
                      <span>{resolvedPriceBR.fontSize}</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="30"
                      step="0.1"
                      value={resolvedPriceBR.fontSize ?? 5}
                      onChange={(e) => updateSetting('fontSize', parseFloat(e.target.value), 'priceBR')}
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              {['name', 'credit', 'effect'].includes(selectedElement) && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    {['credit'].includes(selectedElement) && (
                      <div style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(56, 189, 248, 0.1)', padding: '0.4rem 0.6rem', borderRadius: '4px', borderLeft: '2px solid #38bdf8' }}>
                        <span style={{ fontSize: '0.7rem', color: '#38bdf8' }}>ℹ️ Calibrating for <strong style={{ color: 'white' }}>{backgroundFamily}</strong> family only.</span>
                      </div>
                    )}
                    
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                        <span>Left Position (X)</span>
                        <span>{resolvedSelected.left}%</span>
                      </div>
                      <input
                        type="range"
                        min="-10"
                        max="110"
                        step="0.1"
                        value={resolvedSelected.left}
                        onChange={(e) => updateSetting('left', parseFloat(e.target.value))}
                        style={{ width: '100%' }}
                      />
                    </div>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                        <span>Top Position (Y)</span>
                        <span>{resolvedSelected.top}%</span>
                      </div>
                      <input
                        type="range"
                        min="-10"
                        max="110"
                        step="0.1"
                        value={resolvedSelected.top}
                        onChange={(e) => updateSetting('top', parseFloat(e.target.value))}
                        style={{ width: '100%' }}
                      />
                    </div>
                  </div>

                  {selectedElement !== 'effect' && (
                    <div style={{ marginBottom: '0.75rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                        <span>Font Size (cqw)</span>
                        <span>{resolvedSelected.fontSize}</span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="30"
                        step="0.1"
                        value={resolvedSelected.fontSize ?? 5}
                        onChange={(e) => updateSetting('fontSize', parseFloat(e.target.value))}
                        style={{ width: '100%' }}
                      />
                    </div>
                  )}

                  {['name', 'effect', 'credit'].includes(selectedElement) && (
                    <div style={{ marginBottom: '0.75rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                        <span>Width (%)</span>
                        <span>{resolvedSelected.width}%</span>
                      </div>
                      <input
                        type="range"
                        min="10"
                        max="100"
                        step="1"
                        value={resolvedSelected.width ?? 80}
                        onChange={(e) => updateSetting('width', parseInt(e.target.value))}
                        style={{ width: '100%' }}
                      />
                    </div>
                  )}

                  {['name', 'effect', 'credit'].includes(selectedElement) && (
                    <div style={{ marginBottom: '0.75rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                        <span>Text Color</span>
                      </div>
                      {selectedElement === 'credit' ? (
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          <input
                            type="color"
                            value={getPriceColor('credit', backgroundFamily, layout)}
                            onChange={(e) => updateSetting('color', e.target.value)}
                            style={{
                              flexGrow: 1,
                              height: '32px',
                              padding: '0',
                              border: '1px solid var(--border-color)',
                              borderRadius: 'var(--radius-sm)',
                              background: 'transparent',
                              cursor: 'pointer'
                            }}
                          />
                          <button
                            onClick={() => updateSetting('color', 'default')}
                            style={{
                              padding: '0.35rem 0.5rem',
                              background: 'var(--bg-surface-elevated)',
                              border: '1px solid var(--border-color)',
                              borderRadius: 'var(--radius-sm)',
                              color: 'var(--text-secondary)',
                              fontSize: '0.7rem',
                              cursor: 'pointer'
                            }}
                          >
                            Default
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          <input
                            type="color"
                            value={layout[selectedElement]?.color || '#ffffff'}
                            onChange={(e) => updateSetting('color', e.target.value)}
                            style={{
                              width: '100%',
                              height: '32px',
                              padding: '0',
                              border: '1px solid var(--border-color)',
                              borderRadius: 'var(--radius-sm)',
                              background: 'transparent',
                              cursor: 'pointer'
                            }}
                          />
                          <span style={{ fontSize: '0.8rem', fontFamily: 'monospace' }}>{layout[selectedElement]?.color || '#ffffff'}</span>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {['effect', 'effectIcon'].includes(selectedElement) && (
            <>
              <div style={{ marginBottom: '0.75rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                  <span>Background Color & Opacity</span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <input
                    type="color"
                    value={layout.effect.bgColor ?? '#000000'}
                    onChange={(e) => updateSetting('bgColor', e.target.value)}
                    style={{
                      flex: 1,
                      height: '32px',
                      padding: '0',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-sm)',
                      background: 'transparent',
                      cursor: 'pointer'
                    }}
                  />
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={layout.effect.bgOpacity ?? 0.6}
                    onChange={(e) => updateSetting('bgOpacity', parseFloat(e.target.value))}
                    style={{ flex: 2 }}
                    title={`Opacity: ${layout.effect.bgOpacity ?? 0.6}`}
                  />
                </div>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                    <span>Panel Height (cqw)</span>
                    <span>{layout.effect.panelHeight ?? 8.5}</span>
                  </div>
                  <input
                    type="range"
                    min="2"
                    max="20"
                    step="0.5"
                    value={layout.effect.panelHeight ?? 8.5}
                    onChange={(e) => updateSetting('panelHeight', parseFloat(e.target.value))}
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                    <span>Panel Gap (cqw)</span>
                    <span>{layout.effect.panelGap ?? 1.5}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    step="0.5"
                    value={layout.effect.panelGap ?? 1.5}
                    onChange={(e) => updateSetting('panelGap', parseFloat(e.target.value))}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--border-color)', margin: '1rem 0', paddingTop: '0.5rem' }}>
                <h4 style={{ fontSize: '0.85rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Timing Icon Properties</h4>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                      <span>Size</span>
                      <span>{layout.effectIcon?.size ?? layout.effect?.iconSize ?? 6.0}</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="15"
                      step="0.1"
                      value={layout.effectIcon?.size ?? layout.effect?.iconSize ?? 6.0}
                      onChange={(e) => {
                        setLayout(prev => ({
                          ...prev,
                          effectIcon: {
                            ...prev.effectIcon,
                            size: parseFloat(e.target.value)
                          }
                        }));
                      }}
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                      <span>Left Off.</span>
                      <span>{layout.effectIcon?.left ?? 0}</span>
                    </div>
                    <input
                      type="range"
                      min="-20"
                      max="20"
                      step="0.1"
                      value={layout.effectIcon?.left ?? 0}
                      onChange={(e) => {
                        setLayout(prev => ({
                          ...prev,
                          effectIcon: {
                            ...prev.effectIcon,
                            left: parseFloat(e.target.value)
                          }
                        }));
                      }}
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                      <span>Top Off.</span>
                      <span>{layout.effectIcon?.top ?? layout.effect?.iconOffset ?? 0.2}</span>
                    </div>
                    <input
                      type="range"
                      min="-5"
                      max="15"
                      step="0.1"
                      value={layout.effectIcon?.top ?? layout.effect?.iconOffset ?? 0.2}
                      onChange={(e) => {
                        setLayout(prev => ({
                          ...prev,
                          effectIcon: {
                            ...prev.effectIcon,
                            top: parseFloat(e.target.value)
                          }
                        }));
                      }}
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--border-color)', margin: '1rem 0', paddingTop: '0.5rem' }}>
                <h4 style={{ fontSize: '0.85rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Internal Text Properties</h4>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                      <span>Text Left (cqw)</span>
                      <span>{layout.effect.textLeft ?? 10.0}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="30"
                      step="0.5"
                      value={layout.effect.textLeft ?? 10.0}
                      onChange={(e) => updateSetting('textLeft', parseFloat(e.target.value))}
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                      <span>Text Top (cqw)</span>
                      <span>{layout.effect.textTop ?? 1.5}</span>
                    </div>
                    <input
                      type="range"
                      min="-5"
                      max="10"
                      step="0.5"
                      value={layout.effect.textTop ?? 1.5}
                      onChange={(e) => updateSetting('textTop', parseFloat(e.target.value))}
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                      <span>Text Width (%)</span>
                      <span>{layout.effect.textWidth ?? 80}%</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="100"
                      step="1"
                      value={layout.effect.textWidth ?? 80}
                      onChange={(e) => updateSetting('textWidth', parseInt(e.target.value))}
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                      <span>Text Height (%)</span>
                      <span>{layout.effect.textHeight ?? 70}%</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="100"
                      step="1"
                      value={layout.effect.textHeight ?? 70}
                      onChange={(e) => updateSetting('textHeight', parseInt(e.target.value))}
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Section 3: Configuration JSON Import/Export */}
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.75rem', color: '#f472b6', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Download size={16} /> 3. Layout JSON Configuration
          </h3>

          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <button
              onClick={copyLayoutToClipboard}
              style={{
                flexGrow: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem',
                padding: '0.45rem 0.6rem',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-surface-elevated)',
                border: '1px solid var(--border-color)',
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontWeight: 600
              }}
            >
              <Copy size={14} /> Copy Config
            </button>

            <button
              onClick={() => {
                setJsonInput(JSON.stringify(layout, null, 2));
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem',
                padding: '0.45rem 0.6rem',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-surface-elevated)',
                border: '1px solid var(--border-color)',
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontWeight: 600
              }}
            >
              View JSON
            </button>
          </div>

          <div>
            <textarea
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              placeholder="Paste Layout JSON configuration here to import..."
              rows="4"
              style={{
                width: '100%',
                padding: '0.4rem 0.5rem',
                background: 'var(--bg-main)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.8rem',
                fontFamily: 'monospace',
                lineHeight: '1.3',
                resize: 'vertical',
                marginBottom: '0.5rem'
              }}
            />
            <button
              onClick={importLayoutConfig}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem',
                padding: '0.45rem 0.6rem',
                borderRadius: 'var(--radius-sm)',
                background: 'linear-gradient(135deg, #ec4899, #db2777)',
                border: 'none',
                color: 'white',
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontWeight: 600,
                boxShadow: '0 4px 12px rgba(236, 72, 153, 0.3)'
              }}
            >
              <Upload size={14} /> Import Layout Configuration
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default CardEditor;
