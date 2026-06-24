import React from 'react';
import { 
  getResolvedElementLayout, 
  getPriceColor, 
  getBackgroundPath, 
  getTimingIcon 
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
    const textLeft = cardLayout.effect.textLeft ?? 10.0;
    const textTop = cardLayout.effect.textTop ?? 1.5;
    const textWidth = cardLayout.effect.textWidth ?? 80;
    const textHeight = cardLayout.effect.textHeight ?? 70;

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
            padding: `${cardLayout.effect.padding}px`,
            borderRadius: `${cardLayout.effect.borderRadius}cqw`,
            boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
            border: '0.5cqw solid rgba(255,255,255,0.1)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            position: 'absolute',
            left: 0,
            top: 0
          }}>
            <div style={{
              position: 'absolute',
              left: `${textLeft}%`,
              top: `${textTop}%`,
              width: `${textWidth}%`,
              height: `${textHeight}%`,
              display: 'flex',
              alignItems: 'center',
              fontSize: `${cardLayout.effect.fontSize}cqw`,
              fontFamily: 'var(--font-effect)',
              lineHeight: 1.25,
              textShadow: '0 1px 2px rgba(255,255,255,0.8)'
            }} dangerouslySetInnerHTML={{
              __html: text.replace(/\\icon\((.*?)\)/g, (match, iconName) => {
                const parts = iconName.split(',').map(s => s.trim());
                if (parts.length === 2 && parts[0] === 'Score') {
                  return `<span style="display:inline-block; position:relative; width:1.5em; height:1.5em; vertical-align:middle; margin:0 0.1em;">
                            <img src="./img/Effect/Score.png" style="width:100%; height:100%; object-fit:contain;" />
                            <span style="position:absolute; inset:0; display:flex; align-items:center; justify-content:center; font-weight:900; color:white; -webkit-text-stroke: 0.5px black; font-size:0.8em; margin-top:2px;">${parts[1]}</span>
                          </span>`;
                }
                const pathMap = {
                  'Stone1': './img/Effect/Stone1.png',
                  'Stone3': './img/Effect/Stone3.png',
                  'Stone6': './img/Effect/Stone6.png',
                  'Fire': './img/Effect/Fire.png',
                  'Water': './img/Effect/Water.png',
                  'Earth': './img/Effect/Earth.png',
                  'Wind': './img/Effect/Wind.png',
                  'Dragon': './img/Effect/Dragon.png',
                };
                return `<img src="${pathMap[parts[0]] || match}" style="height: 1.5em; vertical-align: middle; margin: 0 0.1em;" />`;
              }).replace(/\\italic\((.*?)\)/g, '<i>$1</i>')
            }} />
          </div>
          {icon && (
            <img 
              src={icon} 
              alt="Timing" 
              style={{
                position: 'absolute',
                left: `${iconLeft}%`,
                top: `${iconOffset}%`,
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

      <div style={{
        position: 'absolute',
        left: `${resolvedPriceTL.left}%`,
        top: `${resolvedPriceTL.top}%`,
        fontSize: `${resolvedPriceTL.fontSize}cqw`,
        fontFamily: 'var(--font-price)',
        color: priceColorTL,
        lineHeight: 1,
        transform: 'translate(-50%, -50%)',
        zIndex: 2,
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
        zIndex: 2,
        textShadow: '0 2px 4px rgba(0,0,0,0.8)'
      }}>
        {cost}
      </div>

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
        zIndex: 2,
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
        zIndex: 2,
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
        color: cardLayout.credit.color,
        textAlign: 'center',
        transform: 'translate(0, -50%)',
        zIndex: 2,
        textShadow: '0 1px 3px rgba(0,0,0,0.8)'
      }}>
        {credit}
      </div>
    </div>
  );
});

CardPreview.displayName = 'CardPreview';

export default CardPreview;
