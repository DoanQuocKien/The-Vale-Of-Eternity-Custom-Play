import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore.js';
import PackSidebar from './PackSidebar.jsx';
import CardLibrary from './CardLibrary.jsx';
import TokenLibrary from './TokenLibrary.jsx';
import ComponentLibrary from './ComponentLibrary.jsx';

const PackExplorer = ({
  onEditCard,
  onEditToken,
  onEditComponent,
  onExportPack,
  onExportLibrary,
  onImportFile,
  onOpenPdfExport,
  onOpenTokensPdfExport,
  onOpenComponentsPdfExport
}) => {
  const explorerCards = useAppStore(state => state.explorerCards);
  const tokens = useAppStore(state => state.tokens);
  const components = useAppStore(state => state.components);

  const [subTab, setSubTab] = useState('cards'); // 'cards' | 'tokens' | 'components'

  return (
    <div className="animate-fade-in" style={{
      display: 'grid',
      gridTemplateColumns: '0.3fr 0.7fr',
      gap: '2rem',
      marginTop: '1rem',
      alignItems: 'start'
    }}>
      {/* Left Panel: Pack List & Operations Sidebar */}
      <PackSidebar
        onExportPack={onExportPack}
        onExportLibrary={onExportLibrary}
        onImportFile={onImportFile}
        onOpenPdfExport={onOpenPdfExport}
        onOpenTokensPdfExport={onOpenTokensPdfExport}
        onOpenComponentsPdfExport={onOpenComponentsPdfExport}
      />

      {/* Right Panel: Tabbed Asset Libraries */}
      <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', minHeight: '600px' }}>
        
        {/* Sub-tab switcher */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid var(--border-color)',
          paddingBottom: '0.5rem',
          marginBottom: '0.5rem'
        }}>
          <div style={{ display: 'flex', gap: '1rem' }}>
            {[
              { id: 'cards', label: `Cards (${explorerCards.length})` },
              { id: 'tokens', label: `Tokens (${tokens.length})` },
              { id: 'components', label: `Components (${components.length})` }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setSubTab(tab.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  borderBottom: subTab === tab.id ? '2px solid var(--color-primary)' : '2px solid transparent',
                  color: subTab === tab.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  paddingBottom: '0.25rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Action trigger for creating new items */}
          {subTab === 'cards' ? (
            <button
              onClick={() => onEditCard(null)}
              style={{
                padding: '0.35rem 0.75rem',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(99, 102, 241, 0.15)',
                border: '1px solid var(--color-primary)',
                color: 'var(--text-primary)',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <span>➕ Create Card</span>
            </button>
          ) : subTab === 'tokens' ? (
            <button
              onClick={() => onEditToken(null)}
              style={{
                padding: '0.35rem 0.75rem',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(167, 139, 250, 0.15)',
                border: '1px solid #a78bfa',
                color: 'var(--text-primary)',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <span>➕ Create Token</span>
            </button>
          ) : (
            <button
              onClick={() => onEditComponent(null)}
              style={{
                padding: '0.35rem 0.75rem',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(129, 140, 248, 0.15)',
                border: '1px solid #818cf8',
                color: 'var(--text-primary)',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <span>➕ Create Component</span>
            </button>
          )}
        </div>

        {/* Selected Library View */}
        {subTab === 'cards' && <CardLibrary onEditCard={onEditCard} />}
        {subTab === 'tokens' && <TokenLibrary onEditToken={onEditToken} />}
        {subTab === 'components' && <ComponentLibrary onEditComponent={onEditComponent} />}
      </div>
    </div>
  );
};

export default PackExplorer;
