import React, { useState, useEffect } from 'react';
import CardEditor from './components/CardEditor/CardEditor.jsx';
import PackExplorer from './components/PackExplorer/PackExplorer.jsx';
import ExportPdfModal from './components/Export/ExportPdfModal.jsx';
import ExportTokensPdfModal from './components/Export/ExportTokensPdfModal.jsx';
import ExportComponentsPdfModal from './components/Export/ExportComponentsPdfModal.jsx';
import ArtImporter from './components/ArtImporter/ArtImporter.jsx';
import TokenDesigner from './components/TokenDesigner/TokenDesigner.jsx';
import ComponentDesigner from './components/ComponentDesigner/ComponentDesigner.jsx';
import FamilyDesigner from './components/FamilyDesigner/FamilyDesigner.jsx';
import RulebookDesigner from './components/RulebookDesigner/RulebookDesigner.jsx';
import { useAppStore } from './store/useAppStore.js';
import { RefreshCw } from 'lucide-react';
import { startAIServer } from './utils/pythonRunner.js';
import { MOCK_PRESETS, DEFAULT_LAYOUT } from './utils/constants.jsx';

export default function App() {
  const [activeTab, setActiveTab] = useState('explorer');
  
  // Modals state
  const [showArtImporter, setShowArtImporter] = useState(false);
  const [artImporterContext, setArtImporterContext] = useState({ family: 'Water', existingArt: null });
  // The callback given by the editor to set the art image data
  const [artCallback, setArtCallback] = useState(null);

  const [pdfExportIsOpen, setPdfExportIsOpen] = useState(false);
  const [pdfExportCards, setPdfExportCards] = useState([]);
  const [pdfExportPackName, setPdfExportPackName] = useState('');

  const [tokensPdfExportIsOpen, setTokensPdfExportIsOpen] = useState(false);
  const [tokensPdfExportPackName, setTokensPdfExportPackName] = useState('');
  const [tokensPdfExportItems, setTokensPdfExportItems] = useState(null); // null = use all

  const [componentsPdfExportIsOpen, setComponentsPdfExportIsOpen] = useState(false);
  const [componentsPdfExportPackName, setComponentsPdfExportPackName] = useState('');
  const [componentsPdfExportItems, setComponentsPdfExportItems] = useState(null); // null = use all

  const initializeApp = useAppStore(state => state.initializeApp);
  const setActiveCard = useAppStore(state => state.setActiveCard);
  const setActiveToken = useAppStore(state => state.setActiveToken);
  const tokens = useAppStore(state => state.tokens);
  const hasUnsavedChanges = useAppStore(state => state.hasUnsavedChanges);
  const setHasUnsavedChanges = useAppStore(state => state.setHasUnsavedChanges);

  const handleTabChange = (targetTab) => {
    if (activeTab === targetTab) return;
    if (hasUnsavedChanges) {
      const sourceName = 
        activeTab === 'editor' ? 'Card Editor' :
        activeTab === 'tokens' ? 'Token Designer' :
        activeTab === 'components' ? 'Board Component Designer' :
        'Designer';
      const confirmLeave = window.confirm(
        `You have unsaved changes in the ${sourceName}. Are you sure you want to leave? Your changes will be lost.`
      );
      if (!confirmLeave) return;
      setHasUnsavedChanges(false);
    }
    setActiveTab(targetTab);
  };

  useEffect(() => {
    initializeApp();
    startAIServer();
  }, [initializeApp]);

  const handleOpenPdfExport = (cards, packName) => {
    setPdfExportCards(cards);
    setPdfExportPackName(packName);
    setPdfExportIsOpen(true);
  };

  const handleOpenTokensPdfExport = (packName, selectedItems = null) => {
    setTokensPdfExportPackName(packName);
    setTokensPdfExportItems(selectedItems);
    setTokensPdfExportIsOpen(true);
  };

  const handleOpenComponentsPdfExport = (packName, selectedItems = null) => {
    setComponentsPdfExportPackName(packName);
    setComponentsPdfExportItems(selectedItems);
    setComponentsPdfExportIsOpen(true);
  };

  const handleShowArtImporter = (context, callback) => {
    setArtImporterContext(context);
    setArtCallback(() => callback);
    setShowArtImporter(true);
  };

  const handleArtConfirmed = (artData) => {
    if (artCallback) {
      artCallback(artData);
    }
    setHasUnsavedChanges(true);
  };

  const exportPack = async (pack) => {
    try {
      const { serializePack, downloadPackFile } = await import('./utils/packSharing.js');
      const serialized = await serializePack(pack);
      downloadPackFile(pack.name, serialized);
    } catch (err) {
      alert('Failed to export pack: ' + err.message);
    }
  };

  const exportEntireLibrary = async () => {
    const { dbGetPacks, dbGetCards, dbGetTokens, dbGetComponents } = await import('./services/db.js');
    const allPacks = await dbGetPacks();
    const allData = [];
    for (const pack of allPacks) {
      const pCards = await dbGetCards(pack.id);
      const pTokens = await dbGetTokens(pack.id);
      const pComps = await dbGetComponents(pack.id);
      allData.push({ pack, cards: pCards, tokens: pTokens, components: pComps });
    }
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({
      type: 'vale-library',
      packs: allData
    }, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "vale_of_eternity_library.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const fileContent = event.target.result;
        const parsed = JSON.parse(fileContent);
        
        const { dbSavePack, dbSaveCard, dbSaveToken, dbSaveComponent } = await import('./services/db.js');

        if (parsed.type === 'vale-library') {
          for (const item of parsed.packs) {
            await dbSavePack(item.pack);
            if (item.cards) {
              for (const card of item.cards) {
                await dbSaveCard(card);
              }
            }
            if (item.tokens) {
              for (const tok of item.tokens) {
                await dbSaveToken(tok);
              }
            }
            if (item.components) {
              for (const comp of item.components) {
                await dbSaveComponent(comp);
              }
            }
          }
          alert('Entire library imported successfully!');
        } else {
          // Standard single pack (.voe-pack or old format)
          const { processImportedPack, saveImportedPack } = await import('./utils/packSharing.js');
          const importedData = processImportedPack(fileContent);
          await saveImportedPack(importedData);
          alert(`Pack "${importedData.pack.name}" imported successfully as a new copy!`);
        }
        useAppStore.getState().loadPacks();
      } catch (err) {
        alert('Failed to parse and import pack file: ' + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <>
      <div className="app-container animate-fade-in" style={{ padding: '1.5rem', maxWidth: '1600px', margin: '0 auto' }}>
        <header style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid var(--border-color)',
          paddingBottom: '1rem',
        }}>
          <div>
            <h1 style={{
              fontSize: '1.75rem',
              fontWeight: 800,
              background: 'linear-gradient(to right, #818cf8, #a78bfa, #f472b6)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: '-0.025em',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              The Vale of Eternity <span style={{
                fontSize: '0.75rem',
                fontWeight: 500,
                padding: '0.2rem 0.5rem',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--color-primary)',
                color: 'white',
                letterSpacing: 'normal',
                WebkitTextFillColor: 'initial',
                alignSelf: 'center'
              }}>Card Creator</span>
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.1rem' }}>
              Design, customize, and export custom creature cards for The Vale of Eternity.
            </p>
          </div>
        </header>

        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', marginBottom: '1.5rem', gap: '1.5rem', paddingTop: '1rem' }}>
          <button
            onClick={() => handleTabChange('explorer')}
            style={{
              padding: '0.75rem 1.5rem',
              background: activeTab === 'explorer' ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
              border: 'none',
              borderBottom: activeTab === 'explorer' ? '3px solid var(--color-primary)' : '3px solid transparent',
              color: activeTab === 'explorer' ? 'var(--text-primary)' : 'var(--text-secondary)',
              fontSize: '0.95rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all var(--transition-fast)'
            }}
          >
            Pack Explorer
          </button>
          <button
            onClick={() => handleTabChange('editor')}
            style={{
              padding: '0.75rem 1.5rem',
              background: activeTab === 'editor' ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
              border: 'none',
              borderBottom: activeTab === 'editor' ? '3px solid var(--color-primary)' : '3px solid transparent',
              color: activeTab === 'editor' ? 'var(--text-primary)' : 'var(--text-secondary)',
              fontSize: '0.95rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all var(--transition-fast)'
            }}
          >
            Interactive Designer
          </button>
          <button
            onClick={() => handleTabChange('tokens')}
            style={{
              padding: '0.75rem 1.5rem',
              background: activeTab === 'tokens' ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
              border: 'none',
              borderBottom: activeTab === 'tokens' ? '3px solid var(--color-primary)' : '3px solid transparent',
              color: activeTab === 'tokens' ? 'var(--text-primary)' : 'var(--text-secondary)',
              fontSize: '0.95rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all var(--transition-fast)'
            }}
          >
            Token Designer
          </button>
          <button
            onClick={() => handleTabChange('components')}
            style={{
              padding: '0.75rem 1.5rem',
              background: activeTab === 'components' ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
              border: 'none',
              borderBottom: activeTab === 'components' ? '3px solid var(--color-primary)' : '3px solid transparent',
              color: activeTab === 'components' ? 'var(--text-primary)' : 'var(--text-secondary)',
              fontSize: '0.95rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all var(--transition-fast)'
            }}
          >
            Component Designer
          </button>
          <button
            onClick={() => handleTabChange('families')}
            style={{
              padding: '0.75rem 1.5rem',
              background: activeTab === 'families' ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
              border: 'none',
              borderBottom: activeTab === 'families' ? '3px solid var(--color-primary)' : '3px solid transparent',
              color: activeTab === 'families' ? 'var(--text-primary)' : 'var(--text-secondary)',
              fontSize: '0.95rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all var(--transition-fast)'
            }}
          >
            Family Designer
          </button>
          <button
            onClick={() => handleTabChange('rulebooks')}
            style={{
              padding: '0.75rem 1.5rem',
              background: activeTab === 'rulebooks' ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
              border: 'none',
              borderBottom: activeTab === 'rulebooks' ? '3px solid var(--color-primary)' : '3px solid transparent',
              color: activeTab === 'rulebooks' ? 'var(--text-primary)' : 'var(--text-secondary)',
              fontSize: '0.95rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all var(--transition-fast)'
            }}
          >
            Rulebook Maker
          </button>
        </div>

        {activeTab === 'editor' && (
          <CardEditor onShowArtImporter={handleShowArtImporter} />
        )}

        {activeTab === 'explorer' && (
          <PackExplorer 
            onEditCard={(c) => {
              setActiveCard(c);
              setActiveTab('editor');
            }}
            onEditToken={(t) => {
              setActiveToken(t);
              setActiveTab('tokens');
            }}
            onEditComponent={(c) => {
              useAppStore.getState().setActiveComponent(c);
              setActiveTab('components');
            }}
            onExportPack={exportPack}
            onExportLibrary={exportEntireLibrary}
            onImportFile={handleImportFile}
            onOpenPdfExport={handleOpenPdfExport}
            onOpenTokensPdfExport={handleOpenTokensPdfExport}
            onOpenComponentsPdfExport={handleOpenComponentsPdfExport}
          />
        )}

        {activeTab === 'tokens' && (
          <TokenDesigner onShowArtImporter={handleShowArtImporter} />
        )}

        {activeTab === 'components' && (
          <ComponentDesigner onShowArtImporter={handleShowArtImporter} />
        )}

        {activeTab === 'families' && (
          <FamilyDesigner onShowArtImporter={handleShowArtImporter} />
        )}

        {activeTab === 'rulebooks' && (
          <RulebookDesigner />
        )}
      </div>

      <ArtImporter
        isOpen={showArtImporter}
        onClose={() => setShowArtImporter(false)}
        onArtConfirmed={handleArtConfirmed}
        cardFamily={artImporterContext.family || 'Water'}
        existingArt={artImporterContext.existingArt}
        existingTransform={artImporterContext.existingTransform}
        isTokenMode={artImporterContext.isTokenMode}
        isComponentMode={artImporterContext.isComponentMode}
        isBgMode={artImporterContext.isBgMode}
        isIconMode={artImporterContext.isIconMode}
        cardName={artImporterContext.cardName || ''}
        cardCost={artImporterContext.cardCost || 0}
        cardEffect={artImporterContext.cardEffect || ''}
      />

      <ExportPdfModal
        isOpen={pdfExportIsOpen}
        onClose={() => setPdfExportIsOpen(false)}
        cards={pdfExportCards}
        defaultLayout={DEFAULT_LAYOUT}
        packName={pdfExportPackName}
      />

      <ExportTokensPdfModal
        isOpen={tokensPdfExportIsOpen}
        onClose={() => setTokensPdfExportIsOpen(false)}
        tokens={tokensPdfExportItems !== null ? tokensPdfExportItems : tokens}
        packName={tokensPdfExportPackName}
      />

      <ExportComponentsPdfModal
        isOpen={componentsPdfExportIsOpen}
        onClose={() => setComponentsPdfExportIsOpen(false)}
        components={componentsPdfExportItems !== null ? componentsPdfExportItems : useAppStore.getState().components}
        packName={componentsPdfExportPackName}
      />
    </>
  );
}
