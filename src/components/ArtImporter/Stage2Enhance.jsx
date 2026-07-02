import React, { useState, useEffect, useRef } from 'react';
import { Loader, ChevronRight } from 'lucide-react';
import { parseEffectText } from '../../utils/constants.jsx';
import { runPythonRecommendation } from '../../utils/pythonRunner.js';
import { useAppStore } from '../../store/useAppStore.js';

const CARD_NAMES = [
  "Abyssal Maw", "Aether Serpent", "Agate Guardian", "Amber Wasp", "Ancient Colossus",
  "Apex Wyrm", "Aquatic Sentinel", "Archon of Light", "Ashen Drake", "Astral Phoenix",
  "Basalt Golem", "Blaze Stag", "Blighted Stalker", "Bone Wyrm", "Bramble Warden",
  "Canyon Behemoth", "Cavern Lurker", "Celestial Archon", "Chimeran Wraith", "Cinder Wolf",
  "Cloud Sovereign", "Coral Hermit", "Cosmic Leviathan", "Crimson Reaver", "Cursed Revenant",
  "Dawn Herald", "Deepsea Lurker", "Desert Prowler", "Dune Stalker", "Dust Shaman",
  "Earthquake Turtle", "Eclipse Owl", "Emerald Viper", "Ember Lynx", "Ethereal Wraith",
  "Feral Panther", "Flame Djinn", "Forest Patriarch", "Frost Wyrm", "Gilded Sentinel",
  "Glacier Behemoth", "Grave Warden", "Gryphon Paragon", "Ironclad Tortoise", "Jade Crab",
  "Lava Archon", "Lightning Falcon", "Magma Turtle", "Meadow Muse", "Mirage Panther",
  "Mist Weaver", "Monolith Guardian", "Moss Colossus", "Nebula Whale", "Nightmare Steed",
  "Obsidian Golem", "Onyx Basilisk", "Peak Sovereign", "Petal Dancer", "Phantom Stag",
  "Plague Wasp", "Primordial Slime", "Pyroclastic Beast", "Quicksand Worm", "Radiant Archon",
  "Rift Walker", "River Nymph", "Rust Golem", "Sandstone Sphinx", "Scarlet Phoenix",
  "Scorch Scorpion", "Sea Serpent", "Shadow Stalker", "Silt Lurker", "Sky Monarch",
  "Slithering Naga", "Solar Lion", "Spectral Hound", "Spire Gargoyle", "Spore Druid",
  "Storm Archon", "Sunclaw Hawk", "Swamp Horror", "Tectonic Warden", "Tidal Leviathan",
  "Tomb Revenant", "Tundra Wolf", "Typhoon Drake", "Vapor Sprite", "Venomous Spider",
  "Volcanic Hydra", "Vortex Elemental", "Wasp Queen", "Whispering Willow", "Wild Dryad",
  "Wind Runner", "Wyvern Scout", "Zephyr Sprite", "Zenith Dragon", "Abyss Weaver"
];

const CARD_ABILITIES = [
  "⚡ Earn 2 \\icon(Stone1).\n⏳ Recover.",
  "⏳ Gain \\icon(Score, 2) if you control at least one \\icon(Water) card in your Area.",
  "⏳ Pay \\icon(Stone1) to recover a card from the discard pile to your hand.",
  "♾️ Your \\icon(Fire) cards cost \\icon(Stone1) less to summon.",
  "⚡ When this card is discarded from your Area, gain \\icon(Stone3).",
  "⚡ Double the resolution effect of an adjacent \\icon(Earth) card this round.",
  "⏳ Earn \\icon(Stone1) for each summoned card in your Area.",
  "♾️ Your active \\icon(Dragon) cards cannot be targeted by opponents' effects.",
  "⚡ Swap the positions of two cards in the draft zone.",
  "⏳ Discard a card from your hand to search the deck for a \\icon(Wind) card.",
  "♾️ Gain \\icon(Score, 1) for each card in your hand.",
  "⚡ All players return their cheapest summoned card to their hand.",
  "♾️ Whenever you sell a card, draw 1 card.",
  "♾️ At the start of the Resolution Phase, gain \\icon(Stone1) for each active \\icon(Dragon) card.",
  "⏳ Pay \\icon(Stone3) to prevent an opponent's card from activating this round.",
  "⚡ Add a card of cost 3 or less from the draft zone directly to your hand.",
  "♾️ Earth cards in your Area gain protection from removal effects.",
  "♾️ When this card is removed, return it to your hand instead of the discard pile.",
  "⏳ Discard a card from your hand to gain \\icon(Score, 3).",
  "⚡ Take a card from the discard pile and add it to your hand.",
  "♾️ Your \\icon(Wind) cards cost \\icon(Stone1) less to summon.",
  "⚡ Copy the passive effect of another active card in your Area.",
  "⏳ Exchange one \\icon(Stone1) for \\icon(Score, 3).",
  "⏳ Pay \\icon(Stone3) to recover this card to your hand.",
  "⚡ Each opponent must discard one card from their Area.",
  "♾️ Fire cards adjacent to this card cost \\icon(Stone1) less to summon.",
  "⚡ Look at the top three cards of the deck, then put them back in any order.",
  "⏳ Pay \\icon(Stone1) to exchange it for a \\icon(Stone3) from the supply.",
  "♾️ Your \\icon(Water) cards require \\icon(Stone1) less to summon.",
  "⚡ Choose a card in the draft zone; it cannot be tamed this round.",
  "⏳ Discard an \\icon(Earth) card from your hand to gain \\icon(Stone6).",
  "♾️ Dragon cards cost \\icon(Stone3) less to summon.",
  "♾️ Whenever you gain a \\icon(Stone6), gain \\icon(Score, 2).",
  "⏳ Draw a card, then discard a card from your hand.",
  "⏳ Pay \\icon(Stone3) to recover a card from your Area to your hand.",
  "⚡ Choose a player. They must choose and discard a card from their Area.",
  "♾️ Opponents cannot gain \\icon(Stone6) during the Resolution Phase.",
  "⚡ Gain control of an opponent's token or card of cost 2 or less.",
  "⏳ Discard this card to gain \\icon(Stone6) and \\icon(Stone3).",
  "♾️ Your summoned cards cannot be removed by opponent card effects.",
  "♾️ When this card is targeted by an opponent's card, pay \\icon(Stone1) to cancel it.",
  "⏳ Gain \\icon(Score, 1) for each unique family type present in your Area.",
  "⏳ Pay \\icon(Stone3) to gain \\icon(Score, 1) for each of your active \\icon(Fire) cards.",
  "⚡ Gain \\icon(Stone6) and discard a card from your hand.",
  "♾️ Dragon cards adjacent to this card gain \\icon(Score, 2) during resolution.",
  "♾️ When this card is discarded from your hand, draw 2 cards.",
  "⏳ Pay \\icon(Stone1) to change this card's family to \\icon(Water) or \\icon(Fire).",
  "♾️ Your cards of cost 5 or higher cost \\icon(Stone3) less to summon.",
  "⚡ Gain Magic Stones from the supply until you have 4 stones.",
  "⏳ Pay \\icon(Stone3) to choose a player; they must choose and discard a card from their Area.",
  "⏳ Discard a \\icon(Fire) card to search the discard pile for a \\icon(Fire) card.",
  "♾️ All players have a hard limit of 3 Magic Stones instead of 4.",
  "⚡ Draw a card for each active \\icon(Earth) card in your Area.",
  "⏳ Pay \\icon(Stone1) to gain \\icon(Score, 2).",
  "♾️ Your active cards are protected from automatic discard effects.",
  "⚡ Earn \\icon(Score, 1) for each card in the discard pile.",
  "⏳ Gain \\icon(Stone1) if your hand is completely empty.",
  "⏳ Pay \\icon(Stone6) to force all players to discard one summoned card.",
  "♾️ Your \\icon(Wind) cards can be resolved twice during the Resolution Phase.",
  "⚡ Search the deck for a card with the same summoning cost and reveal it.",
  "⏳ Discard this card from your Area to gain \\icon(Score, 6).",
  "♾️ Earth cards in your Area cannot be discarded by card effects.",
  "♾️ When this card is removed, choose an opponent; they must discard a card from their Area.",
  "⏳ Pay \\icon(Stone3) to swap this card with a card in your hand.",
  "♾️ Your \\icon(Water) cards gain \\icon(Score, 1) for each other \\icon(Water) card in your Area.",
  "⚡ Look at the top card of the deck and discard it if you choose.",
  "⏳ Discard a card from your hand to draw a card.",
  "♾️ If you control an active \\icon(Fire) card, this card gains \\icon(Score, 2) during resolution.",
  "♾️ Whenever you summon a card of cost 5 or more, gain \\icon(Score, 3).",
  "⏳ Gain \\icon(Stone1) for each card in the discard pile (max 3).",
  "⏳ Pay \\icon(Stone1) to swap the family of this card with another active card."
];

const FAMILIES = ["Fire", "Water", "Earth", "Wind", "Dragon"];

const Stage2Enhance = ({
  processing,
  progressSteps,
  setProgressSteps,
  runProcessingPipeline,
  setStage,
  setRawDataUrl,
  setDeskewedDataUrl,
  setProcessedDataUrl,
  setFinalDataUrl,
  setIsCreateMode,
  cardName,
  cardCost,
  cardEffect,
  cardFamily
}) => {
  const customFamilies = useAppStore(state => state.families);

  const getFamilyColor = (family) => {
    const customFam = customFamilies.find(f => f.id === family || f.name === family);
    if (customFam) return customFam.primaryColor;
    
    switch (family) {
      case 'Fire': return '#ef4444';
      case 'Water': return '#3b82f6';
      case 'Earth': return '#10b981';
      case 'Wind': return '#06b6d4';
      case 'Dragon': return '#a855f7';
      default: return 'var(--color-primary)';
    }
  };

  const getFamilyBg = (family) => {
    const customFam = customFamilies.find(f => f.id === family || f.name === family);
    if (customFam) return customFam.primaryColor + '26'; // translucent (~15%)
    
    switch (family) {
      case 'Fire': return 'rgba(239, 68, 68, 0.15)';
      case 'Water': return 'rgba(59, 130, 246, 0.15)';
      case 'Earth': return 'rgba(16, 185, 129, 0.15)';
      case 'Wind': return 'rgba(6, 182, 212, 0.15)';
      case 'Dragon': return 'rgba(168, 85, 247, 0.15)';
      default: return 'rgba(99, 102, 241, 0.15)';
    }
  };

  const [currentIdea, setCurrentIdea] = useState(null);
  const [isHovered, setIsHovered] = useState(false);
  const intervalRef = useRef(null);
  const ideasQueueRef = useRef([]);
  const queueIndexRef = useRef(0);
  const cycleCountRef = useRef(0);
  const isPrefetchingRef = useRef(false);

  useEffect(() => {
    if (!processing) {
      setCurrentIdea(null);
      return;
    }

    let ideasQueue = [];
    let queueIndex = 0;
    let cycleCount = 0;
    let isPrefetching = false;
    ideasQueueRef.current = [];
    queueIndexRef.current = 0;
    cycleCountRef.current = 0;
    isPrefetchingRef.current = false;

    const fetchRecommendations = async (isBackground = false) => {
      if (cardEffect || cardName) {
        try {
          const results = await runPythonRecommendation({
            name: cardName,
            cost: cardCost,
            effect: cardEffect,
            family: cardFamily
          });
          if (results && results.length > 0) {
            const mappedResults = results.map(r => ({
              name: r.name,
              ability: r.effect,
              cost: r.cost,
              family: r.family
            }));
            
            if (isBackground) {
              ideasQueue = mappedResults;
              ideasQueueRef.current = mappedResults;
              queueIndex = 0;
              queueIndexRef.current = 0;
              cycleCount = 0;
              cycleCountRef.current = 0;
              setCurrentIdea(ideasQueue[0]);
              isPrefetching = false;
              isPrefetchingRef.current = false;
            } else {
              ideasQueue = mappedResults;
              ideasQueueRef.current = mappedResults;
              setCurrentIdea(ideasQueue[0]);
            }
          }
        } catch (e) {
          console.error('Failed to get RAG recommendations:', e);
        }
      }
      
      const generateRandomIdea = () => {
        const name = CARD_NAMES[Math.floor(Math.random() * CARD_NAMES.length)];
        const ability = CARD_ABILITIES[Math.floor(Math.random() * CARD_ABILITIES.length)];
        const cost = Math.floor(Math.random() * 6) + 1;
        const family = FAMILIES[Math.floor(Math.random() * FAMILIES.length)];
        return { name, ability, cost, family };
      };

      if (ideasQueue.length === 0) {
        for (let i = 0; i < 5; i++) {
          ideasQueue.push(generateRandomIdea());
        }
        ideasQueueRef.current = ideasQueue;
        setCurrentIdea(ideasQueue[0]);
      }
    };

    const tick = (intervalMs) => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(() => {
        if (ideasQueueRef.current.length > 0) {
          const prevIndex = queueIndexRef.current;
          queueIndexRef.current = (queueIndexRef.current + 1) % ideasQueueRef.current.length;
          
          if (queueIndexRef.current === 0 && prevIndex === ideasQueueRef.current.length - 1) {
            cycleCountRef.current += 1;
            if (cycleCountRef.current >= 2 && !isPrefetchingRef.current) {
              isPrefetchingRef.current = true;
              fetchRecommendations(true);
            }
          }
          
          setCurrentIdea(ideasQueueRef.current[queueIndexRef.current]);
          if (intervalMs !== 3500) {
            tick(3500);
          }
        }
      }, intervalMs);
    };

    fetchRecommendations().then(() => tick(3500));

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [processing, cardName, cardCost, cardEffect, cardFamily]);

  const handleIdeaMouseEnter = () => {
    setIsHovered(true);
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  const handleIdeaMouseLeave = () => {
    setIsHovered(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      if (ideasQueueRef.current.length > 0) {
        const prevIndex = queueIndexRef.current;
        queueIndexRef.current = (queueIndexRef.current + 1) % ideasQueueRef.current.length;
        
        if (queueIndexRef.current === 0 && prevIndex === ideasQueueRef.current.length - 1) {
          cycleCountRef.current += 1;
          if (cycleCountRef.current >= 2 && !isPrefetchingRef.current) {
            isPrefetchingRef.current = true;
            runPythonRecommendation({
              name: ideasQueueRef.current[0]?.name || '',
              cost: 0,
              effect: '',
              family: ideasQueueRef.current[0]?.family || 'Water'
            }).then(results => {
              if (results && results.length > 0) {
                const mapped = results.map(r => ({ name: r.name, ability: r.effect, cost: r.cost, family: r.family }));
                ideasQueueRef.current = mapped;
                queueIndexRef.current = 0;
                cycleCountRef.current = 0;
                setCurrentIdea(mapped[0]);
                isPrefetchingRef.current = false;
              }
            }).catch(() => { isPrefetchingRef.current = false; });
          }
        }
        
        setCurrentIdea(ideasQueueRef.current[queueIndexRef.current]);
      }
    }, 2000);
    setTimeout(() => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(() => {
        if (ideasQueueRef.current.length > 0) {
          queueIndexRef.current = (queueIndexRef.current + 1) % ideasQueueRef.current.length;
          setCurrentIdea(ideasQueueRef.current[queueIndexRef.current]);
        }
      }, 3500);
    }, 4000);
  };

  const handleStartOver = () => {
    if (window.confirm('Discard this artwork and start over?')) {
      setRawDataUrl(null);
      setDeskewedDataUrl(null);
      setProcessedDataUrl(null);
      setFinalDataUrl(null);
      setIsCreateMode(false);
      setStage(0);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>
        Configure and run the AI pipeline. Toggle steps on/off to customize the process.
      </p>

      {/* Step toggles */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {progressSteps.map((step, idx) => (
          <div
            key={idx}
            style={{
              padding: '0.85rem 1rem',
              borderRadius: '10px',
              border: `1px solid ${step.active ? 'var(--color-primary)' : step.done ? 'var(--color-success)' : 'var(--border-color)'}`,
              background: step.active ? 'rgba(99,102,241,0.08)' : step.done ? 'rgba(16,185,129,0.06)' : 'var(--bg-surface-elevated)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
              transition: 'all 0.3s'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%' }}>
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  flexShrink: 0,
                  background: step.done ? 'var(--color-success)' : step.active ? 'var(--color-primary)' : 'var(--bg-main)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: `2px solid ${step.done ? 'var(--color-success)' : step.active ? 'var(--color-primary)' : 'var(--border-color)'}`,
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  color: (step.done || step.active) ? 'white' : 'var(--text-muted)'
                }}
              >
                {step.done ? '✓' : step.active ? <Loader size={13} className="spin" /> : idx + 1}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span
                    style={{
                      fontSize: '0.88rem',
                      fontWeight: 700,
                      color: step.skip ? 'var(--text-muted)' : 'var(--text-primary)',
                      textDecoration: step.skip ? 'line-through' : 'none'
                    }}
                  >
                    {step.label}
                  </span>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--text-muted)', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={!step.skip}
                      disabled={processing}
                      onChange={(e) => setProgressSteps(prev => prev.map((s, i) => i === idx ? { ...s, skip: !e.target.checked } : s))}
                    />
                    Enable
                  </label>
                </div>
              </div>
            </div>

            {/* Step level detailed progress bar */}
            {step.active && (
              <div style={{ paddingLeft: '2.25rem', width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--color-primary)', marginBottom: '0.2rem' }}>
                  <span style={{ fontWeight: 600 }}>
                    {step.label === 'Remove Background' ? 'Downloading Model / Extracting...' : 'Processing model layers...'}
                  </span>
                  <span style={{ fontWeight: 800 }}>{step.pct}%</span>
                </div>
                <div style={{ width: '100%', height: '6px', background: 'var(--bg-main)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: `${step.pct}%`, height: '100%', background: 'var(--color-primary)', transition: 'width 0.2s ease-out' }} />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Down time animation & inspiration section */}
      {processing && currentIdea && (
        <div style={{
          marginTop: '0.5rem',
          padding: '1.25rem',
          borderRadius: '12px',
          background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.9), rgba(15, 23, 42, 0.95))',
          border: '1px solid rgba(99, 102, 241, 0.25)',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1rem',
          animation: 'pulseGlow 2.5s infinite alternate'
        }}>
          <style>{`
            @keyframes pulseGlow {
              from { border-color: rgba(99, 102, 241, 0.2); box-shadow: 0 4px 20px rgba(99, 102, 241, 0.15); }
              to { border-color: rgba(99, 102, 241, 0.5); box-shadow: 0 8px 30px rgba(99, 102, 241, 0.35); }
            }
            @keyframes fadeInSlide {
              from { opacity: 0; transform: translateY(12px) scale(0.97); }
              to { opacity: 1; transform: translateY(0) scale(1); }
            }
          `}</style>
          
          <div style={{
            position: 'absolute',
            top: '-50%',
            left: '-50%',
            width: '200%',
            height: '200%',
            background: 'radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 70%)',
            pointerEvents: 'none',
            zIndex: 0
          }} />

          <div style={{ zIndex: 1, textAlign: 'center', width: '100%' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--color-primary)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Card Concepts
            </span>
            <h4 style={{ color: 'white', margin: '0.2rem 0 0.4rem', fontSize: '0.9rem', fontWeight: 700 }}>
              Generating Card Concepts...
            </h4>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', margin: 0, padding: '0 0.5rem' }}>
              The pipeline is processing your image. Here are some custom card concepts to check out while you wait:
            </p>
          </div>

          {/* Animated card idea preview */}
          <div
            style={{
              zIndex: 1,
              width: '100%',
              maxWidth: '280px',
              background: 'var(--bg-surface)',
              border: `2px solid ${getFamilyColor(currentIdea.family)}`,
              borderRadius: '12px',
              padding: '1rem',
              boxShadow: isHovered
                ? `0 12px 40px rgba(0,0,0,0.6), 0 0 0 2px ${getFamilyColor(currentIdea.family)}`
                : '0 6px 20px rgba(0,0,0,0.4)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.65rem',
              position: 'relative',
              animation: 'fadeInSlide 0.5s ease-out',
              transform: isHovered ? 'scale(1.04)' : 'scale(1)',
              transition: 'transform 0.25s ease, box-shadow 0.25s ease',
              cursor: 'pointer'
            }}
            onMouseEnter={handleIdeaMouseEnter}
            onMouseLeave={handleIdeaMouseLeave}
          >
            {/* Header info */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{
                fontSize: '0.65rem',
                fontWeight: 800,
                textTransform: 'uppercase',
                color: getFamilyColor(currentIdea.family),
                background: getFamilyBg(currentIdea.family),
                padding: '0.2rem 0.45rem',
                borderRadius: '5px',
                letterSpacing: '0.04em'
              }}>
                {currentIdea.family}
              </span>
              <div style={{
                width: '22px',
                height: '22px',
                borderRadius: '50%',
                background: getFamilyColor(currentIdea.family),
                color: 'white',
                fontWeight: 900,
                fontSize: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
              }}>
                {currentIdea.cost}
              </div>
            </div>



            {/* Name */}
            <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'white', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.3rem' }}>
              {currentIdea.name}
            </div>

            {/* Ability */}
            <div style={{
              fontSize: '0.78rem',
              lineHeight: 1.45,
              color: 'var(--text-secondary)',
              minHeight: '3.8rem',
              background: 'rgba(255,255,255,0.02)',
              padding: '0.45rem',
              borderRadius: '6px',
              border: '1px solid rgba(255,255,255,0.04)'
            }}>
              {parseEffectText(currentIdea.ability)}
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', width: '100%', borderTop: '1px solid var(--border-color)', paddingTop: '1rem', marginTop: '0.5rem' }}>
        <button
          onClick={handleStartOver}
          disabled={processing}
          style={{
            marginRight: 'auto',
            padding: '0.5rem 1rem',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid var(--color-danger)',
            borderRadius: '8px',
            cursor: processing ? 'not-allowed' : 'pointer',
            fontSize: '0.85rem',
            color: 'var(--color-danger)',
            opacity: processing ? 0.5 : 1
          }}
        >
          🗑️ Start Over
        </button>

        <button
          onClick={() => setStage(1)}
          disabled={processing}
          style={{
            padding: '0.5rem 1rem',
            background: 'transparent',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            cursor: processing ? 'not-allowed' : 'pointer',
            fontSize: '0.85rem',
            color: 'var(--text-muted)',
            opacity: processing ? 0.5 : 1
          }}
        >
          ← Back
        </button>

        <button
          onClick={runProcessingPipeline}
          disabled={processing}
          style={{
            padding: '0.5rem 1.5rem',
            background: 'var(--color-primary)',
            border: 'none',
            borderRadius: '8px',
            cursor: processing ? 'not-allowed' : 'pointer',
            fontSize: '0.85rem',
            fontWeight: 700,
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            boxShadow: '0 4px 12px rgba(99,102,241,0.25)',
            opacity: processing ? 0.5 : 1
          }}
        >
          {processing ? (
            <>
              <Loader size={14} className="spin" /> Processing...
            </>
          ) : (
            <>
              Run AI Pipeline <ChevronRight size={16} />
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default Stage2Enhance;
