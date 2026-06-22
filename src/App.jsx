import React from 'react';
import { Sparkles, FolderOpen, Plus } from 'lucide-react';

// Reusable component to render family icons from public assets, with SVG fallback for missing Water icon
function ElementIcon({ name }) {
  const [hasError, setHasError] = React.useState(false);

  if (name === 'Water' || hasError) {
    return (
      <svg
        viewBox="0 0 24 24"
        width="20"
        height="20"
        fill="currentColor"
        style={{
          display: 'block',
          color: 'var(--family-water)',
          filter: 'drop-shadow(0 0 4px rgba(56, 189, 248, 0.4))'
        }}
      >
        <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
      </svg>
    );
  }

  return (
    <img
      src={`/img/TextIcon/${name}.png`}
      alt={name}
      onError={() => setHasError(true)}
      style={{
        width: '20px',
        height: '20px',
        objectFit: 'contain',
        display: 'block',
        filter: `drop-shadow(0 0 4px var(--family-${name.toLowerCase()}))`
      }}
    />
  );
}

export default function App() {
  return (
    <div className="app-container animate-fade-in">
      <header style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid var(--border-color)',
        paddingBottom: '1.5rem',
      }}>
        <div>
          <h1 style={{
            fontSize: '2rem',
            fontWeight: 800,
            background: 'linear-gradient(to right, #818cf8, #a78bfa, #f472b6)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '-0.025em',
            marginBottom: '0.25rem'
          }}>
            The Vale of Eternity
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            Custom Card & Expansion Creator
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 1rem',
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg-surface-elevated)',
            border: '1px solid var(--border-color)',
            cursor: 'pointer',
            fontSize: '0.9rem',
            transition: 'all var(--transition-fast)'
          }}>
            <FolderOpen size={16} /> Open Pack
          </button>
          <button style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 1rem',
            borderRadius: 'var(--radius-md)',
            background: 'linear-gradient(135deg, var(--color-primary), #4f46e5)',
            border: 'none',
            cursor: 'pointer',
            fontSize: '0.9rem',
            fontWeight: 600,
            boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
            transition: 'all var(--transition-fast)'
          }}>
            <Plus size={16} /> New Card
          </button>
        </div>
      </header>

      <main style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '1.5rem',
        marginTop: '1rem'
      }}>
        {/* Quick Setup Card */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '40px',
            height: '40px',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(99, 102, 241, 0.15)',
            color: 'var(--color-primary)',
            marginBottom: '1rem'
          }}>
            <Sparkles size={20} />
          </div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '0.5rem' }}>
            Workspace Setup Complete
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.5, marginBottom: '1.25rem' }}>
            React + Vite is successfully initialized. Our layout assets have been moved to the public folder and are ready for implementation.
          </p>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            color: 'var(--color-success)',
            fontSize: '0.85rem',
            fontWeight: 500
          }}>
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: 'var(--color-success)'
            }}></div>
            System online
          </div>
        </div>

        {/* Card Anatomy References */}
        <div className="glass-panel" style={{ padding: '1.5rem', gridColumn: 'span 2' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '1.25rem' }}>
            Creature Elements
          </h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: '1rem'
          }}>
            {[
              { name: 'Fire', color: 'var(--family-fire)', bg: 'var(--family-fire-bg)' },
              { name: 'Water', color: 'var(--family-water)', bg: 'var(--family-water-bg)' },
              { name: 'Earth', color: 'var(--family-earth)', bg: 'var(--family-earth-bg)' },
              { name: 'Wind', color: 'var(--family-wind)', bg: 'var(--family-wind-bg)' },
              { name: 'Dragon', color: 'var(--family-dragon)', bg: 'var(--family-dragon-bg)' }
            ].map(family => (
              <div key={family.name} style={{
                background: family.bg,
                border: '1px solid rgba(255, 255, 255, 0.05)',
                borderRadius: 'var(--radius-md)',
                padding: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                transition: 'transform var(--transition-fast), border-color var(--transition-fast)',
                cursor: 'default'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.borderColor = family.color;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)';
              }}>
                <ElementIcon name={family.name} />
                <span style={{ color: family.color, fontWeight: 600, fontSize: '1rem' }}>
                  {family.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
