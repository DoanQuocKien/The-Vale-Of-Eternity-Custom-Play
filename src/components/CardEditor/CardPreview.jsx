import React from 'react';
import { 
  getResolvedElementLayout, 
  getPriceColor, 
  getBackgroundPath, 
  getTimingIcon,
  parseEffectText
} from '../../utils/constants.jsx';

const CardPreview = React.forwardRef(({ card, defaultLayout }, ref) => {
  const { name, cost, family, credit, effect, artImageData, layout } = card;
  const cardLayout = layout || defaultLayout;
  
  const resolvedPriceTL = getResolvedElementLayout('priceTL', family, cardLayout);
  const resolvedPriceBR = getResolvedElementLayout('priceBR', family, cardLayout);
  const resolvedCredit = getResolvedElementLayout('credit', family, cardLayout);
  
  const priceColorTL = getPriceColor('priceTL', family, cardLayout);
  const priceColorBR = getPriceColor('priceBR', family, cardLayout);

  const renderStaticEffectPanels = () => {
    const lines = (effect || '').split('\n');
    const iconSize = cardLayout.effectIcon?.size ?? cardLayout.effect?.iconSize ?? 6.0;
    const iconOffset = cardLayout.effectIcon?.top ?? cardLayout.effect?.iconOffset ?? 0.2;
    const iconLeft = cardLayout.effectIcon?.left ?? 0;

    const panelHeight = cardLayout.effect.panelHeight ?? 8.5;
    const panelGap = cardLayout.effect.panelGap ?? 1.5;
    const textLeft = cardLayout.effect.textLeft ?? 0;
    const textTop = cardLayout.effect.textTop ?? 1.5;
    const textWidth = cardLayout.effect.textWidth ?? 100;
    const textHeight = cardLayout.effect.textHeight ?? 70;
    const textAlign = cardLayout.effect.textAlign ?? 'center';

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
            borderLeft: `2.5px solid var(--family-${family.toLowerCase()})`,
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
              {parseEffectText(text)}
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
        src={getBackgroundPath(family)} 
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
            left: `${artImageData.transform?.x || 50}%`,
            top: `${artImageData.transform?.y || 50}%`,
            width: `${artImageData.transform?.scale || 60}%`,
            transform: `translate(-50%, -50%) rotate(${artImageData.transform?.rotation || 0}deg)`,
            zIndex: 1,
            pointerEvents: 'none'
          }}
        />
      )}

      {/* Everything Else (Name, Effect, Credit) at zIndex: 1 */}
      <div style={{
        position: 'absolute',
        left: `${cardLayout.name.left}%`,
        top: `${cardLayout.name.top}%`,
        width: `${cardLayout.name.width}%`,
        fontSize: `${cardLayout.name.fontSize}cqw`,
        fontFamily: 'var(--font-card-name)',
        color: cardLayout.name.color,
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
        color: getPriceColor('credit', family, cardLayout),
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
      <img
        src={`./img/TextIcon/${family}.png`}
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

      {/* Family Emblem - Bottom-Right at zIndex: 4 */}
      <img
        src={`./img/TextIcon/${family}.png`}
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
    </div>
  );
});

CardPreview.displayName = 'CardPreview';

export default CardPreview;
