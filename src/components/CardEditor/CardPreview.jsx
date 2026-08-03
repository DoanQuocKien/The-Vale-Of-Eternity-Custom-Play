import React from 'react';
import { useAppStore } from '../../store/useAppStore.js';
import {
  getResolvedElementLayout,
  getPriceColor,
  getBackgroundPath,
  getTimingIcon,
  parseEffectText
} from '../../utils/constants.jsx';

const CardPreview = React.forwardRef(({ card, defaultLayout }, ref) => {
  const { name, cost, family, credit, effect, artImageData, layout, tokenOverlays = [] } = card;
  const cardLayout = layout || defaultLayout;

  const tokens = useAppStore(state => state.tokens);
  const families = useAppStore(state => state.families);

  const customFamily = families.find(fam => fam.id === family || fam.name === family);

  const resolvedPriceTL = getResolvedElementLayout('priceTL', family, cardLayout);
  const resolvedPriceBR = getResolvedElementLayout('priceBR', family, cardLayout);
  const resolvedCredit = getResolvedElementLayout('credit', family, cardLayout);

  const rawPriceColorTL = getPriceColor('priceTL', family, cardLayout);
  const rawPriceColorBR = getPriceColor('priceBR', family, cardLayout);
  const rawCreditColor = getPriceColor('credit', family, cardLayout);

  const priceColorTL = (rawPriceColorTL === '#ffffff' && customFamily) ? customFamily.primaryColor : rawPriceColorTL;
  const priceColorBR = (rawPriceColorBR === '#ffffff' && customFamily) ? customFamily.primaryColor : rawPriceColorBR;
  const creditColor = (rawCreditColor === '#ffffff' && customFamily) ? (customFamily.secondaryColor || customFamily.primaryColor) : rawCreditColor;

  const bgSrc = customFamily
    ? (customFamily.bgArt || getBackgroundPath('Water'))
    : getBackgroundPath(family);

  const familyColor = customFamily ? customFamily.primaryColor : `var(--family-${family.toLowerCase()})`;

  const renderStaticEffectPanels = () => {
    const lines = (effect || '').split('\n');
    const iconSize = cardLayout.effectIcon?.size ?? cardLayout.effect?.iconSize ?? 6.0;
    const iconOffset = cardLayout.effectIcon?.top ?? cardLayout.effect?.iconOffset ?? 0.2;
    const iconLeft = cardLayout.effectIcon?.left ?? 0;

    const panelHeight = cardLayout.effect.panelHeight ?? 8.5;
    const panelGap = cardLayout.effect.panelGap ?? 1.5;
    const textLeft = cardLayout.effect.textLeft ?? 10.0;
    const textTop = cardLayout.effect.textTop ?? 1.5;
    const textWidth = cardLayout.effect.textWidth ?? 80;
    const textHeight = cardLayout.effect.textHeight ?? 70;
    const textAlign = cardLayout.effect.textAlign ?? 'left';

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
            background: `rgba(${parseInt(cardLayout.effect.bgColor.slice(1, 3), 16)}, ${parseInt(cardLayout.effect.bgColor.slice(3, 5), 16)}, ${parseInt(cardLayout.effect.bgColor.slice(5, 7), 16)}, ${cardLayout.effect.bgOpacity})`,
            color: cardLayout.effect.color,
            fontSize: `${cardLayout.effect.fontSize}cqw`,
            fontFamily: 'var(--font-effect)',
            borderRadius: `${cardLayout.effect.borderRadius}cqw`,
            borderLeft: `2.5px solid ${familyColor}`,
            boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
            position: 'relative',
            boxSizing: 'border-box',
            display: 'flex',
            alignItems: 'center'
          }}>
            <div style={{
              marginLeft: `${textLeft}cqw`,
              width: `${textWidth}%`,
              textAlign: textAlign,
              lineHeight: 1.35,
              boxSizing: 'border-box',
              overflow: 'visible',
              flexShrink: 0
            }}>
              {parseEffectText(text, tokens, families)}
            </div>
          </div>
          {icon && (
            <img
              src={icon}
              alt="Timing"
              style={{
                position: 'absolute',
                left: `${iconLeft}cqw`,
                top: `${iconOffset}cqw`,
                width: `${iconSize}cqw`,
                height: `${iconSize}cqw`,
                objectFit: 'contain',
                filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))',
                zIndex: 3
              }}
            />
          )}
        </div>
      );
    });
  };

  return (
    <div
      ref={ref}
      style={{
        width: '744px',
        height: '1039px',
        position: 'relative',
        containerType: 'inline-size',
        overflow: 'hidden',
        background: '#111',
        fontFamily: 'var(--font-family)',
        borderRadius: '32px'
      }}
    >
      <img
        src={bgSrc}
        alt="Background"
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          position: 'absolute',
          inset: 0,
          zIndex: 0
        }}
      />

      {artImageData?.dataUrl && (
        <img
          src={artImageData.dataUrl}
          alt="Art"
          style={{
            position: 'absolute',
            left: `${artImageData.transform?.x ?? 50}%`,
            top: `${artImageData.transform?.y ?? 47.7}%`,
            width: `${artImageData.transform?.scale ?? 60}%`,
            transform: `translate(-50%, -50%) rotate(${artImageData.transform?.rotation ?? 0}deg)`,
            zIndex: 1,
            pointerEvents: 'none'
          }}
        />
      )}

      {/* Token Overlays rendering */}
      {tokenOverlays.map(ov => {
        const tok = tokens.find(t => t.id === ov.tokenId);
        const srcImage = tok?.croppedDataUrl || tok?.imageDataUrl;
        if (!tok || !srcImage) return null;
        
        const bboxW = tok.bbox && typeof tok.bbox.w === 'number' ? tok.bbox.w : null;
        const bboxH = tok.bbox && typeof tok.bbox.h === 'number' ? tok.bbox.h : null;
        const bw = bboxW !== null ? bboxW : (tok.canvasW || 1728);
        const bh = bboxH !== null ? bboxH : (tok.canvasH || 2414);

        let aspect = 1728 / 2414;
        if (bw > 0 && bh > 0) {
          aspect = bw / bh;
        }

        const overlaySize = ov.size && !isNaN(ov.size) ? ov.size : 15;
        const cx = ov.cx && !isNaN(ov.cx) ? ov.cx : 50;
        const cy = ov.cy && !isNaN(ov.cy) ? ov.cy : 50;

        return (
          <div
            key={ov.instanceId}
            style={{
              position: 'absolute',
              left: `${cx}%`,
              top: `${cy}%`,
              width: `${overlaySize * aspect}cqw`,
              height: `${overlaySize}cqw`,
              transform: 'translate(-50%, -50%)',
              zIndex: 3,
              pointerEvents: 'none'
            }}
          >
            <img
              src={srcImage}
              alt=""
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain'
              }}
            />
          </div>
        );
      })}

      {/* Everything Else (Name, Effect, Credit) at zIndex: 1 */}
      <div style={{
        position: 'absolute',
        left: `${cardLayout.name.left}%`,
        top: `${cardLayout.name.top}%`,
        width: `${cardLayout.name.width}%`,
        fontSize: `${cardLayout.name.fontSize}cqw`,
        fontFamily: 'var(--font-card-name)',
        color: cardLayout.name.color,
        fontWeight: 'normal',
        textAlign: 'center',
        transform: 'translate(0, -50%)',
        zIndex: 1,
        letterSpacing: '0.02em',
        textShadow: '0 2px 8px rgba(0, 0, 0, 0.9), 0 0 12px rgba(0, 0, 0, 0.7)'
      }}>
        {name}
      </div>

      <div style={{
        position: 'absolute',
        left: `${cardLayout.effect.left}%`,
        top: `${cardLayout.effect.top}%`,
        width: `${cardLayout.effect.width}%`,
        zIndex: 1,
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box'
      }}>
        {renderStaticEffectPanels()}
      </div>

      <div style={{
        position: 'absolute',
        left: `${resolvedCredit.left}%`,
        top: `${resolvedCredit.top}%`,
        width: `${resolvedCredit.width}%`,
        fontSize: `${resolvedCredit.fontSize}cqw`,
        fontFamily: 'var(--font-credit)',
        color: creditColor,
        textAlign: 'center',
        transform: 'translate(0, -50%)',
        zIndex: 1,
        textShadow: '0 1px 3px rgba(0,0,0,0.8)'
      }}>
        {credit}
      </div>

      {/* Card Layout Border at zIndex: 2 */}
      <img
        src="./img/Layout/CardLayout.png"
        alt="Card Layout Border"
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          position: 'absolute',
          inset: 0,
          zIndex: 2,
          pointerEvents: 'none'
        }}
      />

      {/* Price tag (Summoning Cost) at zIndex: 3 */}
      <div style={{
        position: 'absolute',
        left: `${resolvedPriceTL.left}%`,
        top: `${resolvedPriceTL.top}%`,
        fontSize: `${resolvedPriceTL.fontSize}cqw`,
        fontFamily: 'var(--font-price)',
        color: priceColorTL,
        lineHeight: 1,
        transform: 'translate(-50%, -50%)',
        zIndex: 3,
        textShadow: '0 2px 4px rgba(0,0,0,0.8)'
      }}>
        {cost}
      </div>

      <div style={{
        position: 'absolute',
        left: `${resolvedPriceBR.left}%`,
        top: `${resolvedPriceBR.top}%`,
        fontSize: `${resolvedPriceBR.fontSize}cqw`,
        fontFamily: 'var(--font-price)',
        color: priceColorBR,
        lineHeight: 1,
        transform: 'translate(-50%, -50%)',
        zIndex: 3,
        textShadow: '0 2px 4px rgba(0,0,0,0.8)'
      }}>
        {cost}
      </div>

      {/* Family Emblem - Top-Left at zIndex: 4 */}
      {customFamily && !customFamily.icon ? (
        <div style={{
          position: 'absolute',
          left: '8.45%',
          top: '6.46%',
          width: '11.91cqw',
          height: '11.91cqw',
          transform: 'translate(-50%, -50%)',
          zIndex: 4,
          borderRadius: '50%',
          border: '1.5px solid white',
          boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
          background: customFamily.primaryColor,
          color: 'white',
          fontWeight: 'bold',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '5cqw',
          pointerEvents: 'none'
        }}>
          {customFamily.name.charAt(0).toUpperCase()}
        </div>
      ) : (
        <img
          src={customFamily?.icon || `./img/TextIcon/${family}.png`}
          alt={`${family} Emblem TL`}
          style={{
            position: 'absolute',
            left: '8.45%',
            top: '6.46%',
            width: '11.91cqw',
            height: '11.91cqw',
            transform: 'translate(-50%, -50%)',
            zIndex: 4,
            borderRadius: '50%',
            border: '1.5px solid rgba(0, 0, 0, 0.3)',
            boxSizing: 'border-box',
            pointerEvents: 'none'
          }}
        />
      )}

      {/* Family Emblem - Bottom-Right at zIndex: 4 */}
      {customFamily && !customFamily.icon ? (
        <div style={{
          position: 'absolute',
          left: '90.97%',
          top: '93.54%',
          width: '9.84cqw',
          height: '9.84cqw',
          transform: 'translate(-50%, -50%)',
          zIndex: 4,
          borderRadius: '50%',
          border: '1.5px solid white',
          boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
          background: customFamily.primaryColor,
          color: 'white',
          fontWeight: 'bold',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '4.5cqw',
          pointerEvents: 'none'
        }}>
          {customFamily.name.charAt(0).toUpperCase()}
        </div>
      ) : (
        <img
          src={customFamily?.icon || `./img/TextIcon/${family}.png`}
          alt={`${family} Emblem BR`}
          style={{
            position: 'absolute',
            left: '90.97%',
            top: '93.54%',
            width: '9.84cqw',
            height: '9.84cqw',
            transform: 'translate(-50%, -50%)',
            zIndex: 4,
            borderRadius: '50%',
            border: '1.5px solid rgba(0, 0, 0, 0.3)',
            boxSizing: 'border-box',
            pointerEvents: 'none'
          }}
        />
      )}
    </div>
  );
});

CardPreview.displayName = 'CardPreview';

export default CardPreview;
