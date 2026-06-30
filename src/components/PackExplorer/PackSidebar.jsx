import React, { useState } from 'react';
import { Plus, Download, Printer, Upload } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore.js';

const PackSidebar = ({
  onExportPack,
  onExportLibrary,
  onImportFile,
  onOpenPdfExport,
  onOpenTokensPdfExport,
  onOpenComponentsPdfExport
}) => {
  const packs = useAppStore(state => state.packs);
  const activePackId = useAppStore(state => state.activePackId);
  const explorerCards = useAppStore(state => state.explorerCards);
  const tokens = useAppStore(state => state.tokens);
  const components = useAppStore(state => state.components);

  const setActivePackId = useAppStore(state => state.setActivePackId);
  const createNewPack = useAppStore(state => state.createNewPack);
  const deletePack = useAppStore(state => state.deletePack);
  const renamePack = useAppStore(state => state.renamePack);

  const [isAddingPack, setIsAddingPack] = useState(false);
  const [newPackName, setNewPackName] = useState('');
  const [renamingPackId, setRenamingPackId] = useState(null);
  const [renamePackValue, setRenamePackValue] = useState('');

  const handleAddPack = async () => {
    if (!newPackName.trim()) return;
    await createNewPack(newPackName.trim());
    setNewPackName('');
    setIsAddingPack(false);
  };

  const handleDeletePack = async (pack) => {
    if (window.confirm(`Are you sure you want to delete pack "${pack.name}" and all cards in it?`)) {
      await deletePack(pack.id);
    }
  };

  const handleRenamePack = (pack) => {
    setRenamingPackId(pack.id);
    setRenamePackValue(pack.name);
  };

  const submitRenamePack = async (packId) => {
    const trimmed = renamePackValue.trim();
    if (trimmed && trimmed !== packs.find(p => p.id === packId)?.name) {
      await renamePack(packId, trimmed);
    }
    setRenamingPackId(null);
    setRenamePackValue('');
  };

  return (
    <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-primary)' }}>Packs & Expansions</h3>
        <button
          onClick={() => { setIsAddingPack(p => !p); setNewPackName(''); }}
          style={{
            padding: '0.3rem 0.6rem',
            borderRadius: 'var(--radius-sm)',
            background: isAddingPack ? 'var(--bg-surface-elevated)' : 'var(--color-primary)',
            border: isAddingPack ? '1px solid var(--border-color)' : 'none',
            color: 'white',
            fontSize: '0.75rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.2rem'
          }}
        >
          {isAddingPack ? '✕ Cancel' : <><Plus size={12} /> Add Pack</>}
        </button>
      </div>

      {/* Inline Add Pack Form */}
      {isAddingPack && (
        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
          <input
            type="text"
            value={newPackName}
            onChange={(e) => setNewPackName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddPack();
              if (e.key === 'Escape') { setIsAddingPack(false); setNewPackName(''); }
            }}
            placeholder="New pack name..."
            autoFocus
            style={{
              flex: 1,
              padding: '0.35rem 0.5rem',
              background: 'var(--bg-main)',
              border: '1px solid var(--color-primary)',
              borderRadius: 'var(--radius-sm)',
              color: 'white',
              fontSize: '0.8rem',
              outline: 'none'
            }}
          />
          <button
            onClick={handleAddPack}
            disabled={!newPackName.trim()}
            style={{
              padding: '0.35rem 0.6rem',
              background: 'var(--color-primary)',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              color: 'white',
              fontSize: '0.75rem',
              fontWeight: 700,
              cursor: newPackName.trim() ? 'pointer' : 'not-allowed',
              opacity: newPackName.trim() ? 1 : 0.5
            }}
          >
            Create
          </button>
        </div>
      )}

      {/* Pack List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '400px', overflowY: 'auto' }}>
        {packs.map(p => (
          <div
            key={p.id}
            onClick={() => setActivePackId(p.id)}
            style={{
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-md)',
              background: activePackId === p.id ? 'var(--bg-surface-elevated)' : 'transparent',
              border: activePackId === p.id ? '1px solid var(--color-primary)' : '1px solid transparent',
              cursor: 'pointer',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              transition: 'all var(--transition-fast)'
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
              {renamingPackId === p.id ? (
                <input
                  type="text"
                  value={renamePackValue}
                  autoFocus
                  onChange={(e) => setRenamePackValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') submitRenamePack(p.id);
                    if (e.key === 'Escape') { setRenamingPackId(null); setRenamePackValue(''); }
                  }}
                  onBlur={() => submitRenamePack(p.id)}
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    background: 'var(--bg-main)',
                    border: '1px solid var(--color-primary)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '0.1rem 0.4rem',
                    outline: 'none',
                    width: '100%'
                  }}
                />
              ) : (
                <span style={{ fontSize: '0.9rem', fontWeight: 600, color: activePackId === p.id ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                  {p.name}
                </span>
              )}
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                {p.id === 'starter-pack' ? 'Built-in set' : 'Custom set'}
              </span>
            </div>

            {p.id !== 'starter-pack' && (
              <div style={{ display: 'flex', gap: '0.35rem' }} onClick={e => e.stopPropagation()}>
                {renamingPackId === p.id ? (
                  <>
                    <button
                      onClick={() => submitRenamePack(p.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', color: 'var(--color-primary)' }}
                      title="Confirm Rename"
                    >✔️</button>
                    <button
                      onClick={() => { setRenamingPackId(null); setRenamePackValue(''); }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', color: 'var(--text-muted)' }}
                      title="Cancel"
                    >✕</button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => handleRenamePack(p)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', color: 'var(--text-muted)' }}
                      title="Rename Pack"
                    >✏️</button>
                    <button
                      onClick={() => handleDeletePack(p)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', color: 'var(--color-danger)' }}
                      title="Delete Pack"
                    >🗑️</button>
                  </>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Pack Set Operations Footer */}
      <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.50rem' }}>
        <button
          onClick={() => {
            const activePack = packs.find(p => p.id === activePackId);
            if (activePack) onExportPack(activePack);
          }}
          disabled={!activePackId}
          style={{
            width: '100%',
            padding: '0.45rem',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--bg-surface-elevated)',
            border: '1px solid var(--border-color)',
            cursor: activePackId ? 'pointer' : 'not-allowed',
            fontSize: '0.8rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.4rem',
            color: 'var(--text-secondary)',
            opacity: activePackId ? 1 : 0.5
          }}
        >
          <Download size={14} /> Export Active Pack (.voe-pack)
        </button>

        <button
          onClick={() => {
            const activePack = packs.find(p => p.id === activePackId);
            const activePackName = activePack ? activePack.name : 'Pack';
            onOpenPdfExport(explorerCards, activePackName);
          }}
          disabled={!activePackId || explorerCards.length === 0}
          style={{
            width: '100%',
            padding: '0.45rem',
            borderRadius: 'var(--radius-sm)',
            background: 'linear-gradient(135deg, var(--color-primary), #8b5cf6)',
            border: 'none',
            cursor: (activePackId && explorerCards.length > 0) ? 'pointer' : 'not-allowed',
            fontSize: '0.8rem',
            fontWeight: 700,
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.4rem',
            opacity: (activePackId && explorerCards.length > 0) ? 1 : 0.5,
            boxShadow: (activePackId && explorerCards.length > 0) ? '0 4px 12px rgba(99, 102, 241, 0.2)' : 'none',
            transition: 'all 0.2s',
            marginBottom: '0.35rem'
          }}
        >
          <Printer size={13} /> Export Cards to PDF
        </button>

        <button
          onClick={() => {
            const activePack = packs.find(p => p.id === activePackId);
            const activePackName = activePack ? activePack.name : 'Pack';
            onOpenTokensPdfExport(activePackName);
          }}
          disabled={!activePackId || tokens.length === 0}
          style={{
            width: '100%',
            padding: '0.45rem',
            borderRadius: 'var(--radius-sm)',
            background: 'linear-gradient(135deg, #10b981, #059669)',
            border: 'none',
            cursor: (activePackId && tokens.length > 0) ? 'pointer' : 'not-allowed',
            fontSize: '0.8rem',
            fontWeight: 700,
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.4rem',
            opacity: (activePackId && tokens.length > 0) ? 1 : 0.5,
            boxShadow: (activePackId && tokens.length > 0) ? '0 4px 12px rgba(16, 185, 129, 0.2)' : 'none',
            transition: 'all 0.2s',
            marginBottom: '0.35rem'
          }}
        >
          <Printer size={13} /> Export Tokens to PDF
        </button>

        <button
          onClick={() => {
            const activePack = packs.find(p => p.id === activePackId);
            const activePackName = activePack ? activePack.name : 'Pack';
            onOpenComponentsPdfExport(activePackName);
          }}
          disabled={!activePackId || components.length === 0}
          style={{
            width: '100%',
            padding: '0.45rem',
            borderRadius: 'var(--radius-sm)',
            background: 'linear-gradient(135deg, #818cf8, #6366f1)',
            border: 'none',
            cursor: (activePackId && components.length > 0) ? 'pointer' : 'not-allowed',
            fontSize: '0.8rem',
            fontWeight: 700,
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.4rem',
            opacity: (activePackId && components.length > 0) ? 1 : 0.5,
            boxShadow: (activePackId && components.length > 0) ? '0 4px 12px rgba(99, 102, 241, 0.2)' : 'none',
            transition: 'all 0.2s',
            marginBottom: '0.35rem'
          }}
        >
          <Printer size={13} /> Export Components to PDF
        </button>

        <div style={{ height: '1px', background: 'var(--border-color)', margin: '0.25rem 0' }} />

        <button
          onClick={onExportLibrary}
          style={{
            width: '100%',
            padding: '0.45rem',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--bg-surface-elevated)',
            border: '1px solid var(--border-color)',
            cursor: 'pointer',
            fontSize: '0.8rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.4rem',
            color: 'var(--text-secondary)'
          }}
        >
          <Download size={14} /> Export Full Library JSON
        </button>

        <input
          type="file"
          id="import-file-input-explorer"
          accept=".json,.voe-pack"
          onChange={onImportFile}
          style={{ display: 'none' }}
        />
        <button
          onClick={() => document.getElementById('import-file-input-explorer').click()}
          style={{
            width: '100%',
            padding: '0.45rem',
            borderRadius: 'var(--radius-sm)',
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px dashed var(--color-success)',
            color: 'var(--color-success)',
            cursor: 'pointer',
            fontSize: '0.8rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.4rem'
          }}
        >
          <Upload size={14} /> Import Pack/Library File
        </button>
      </div>
    </div>
  );
};

export default PackSidebar;
