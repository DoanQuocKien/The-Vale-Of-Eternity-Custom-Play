import React, { useState, useEffect } from 'react';
import CardEditor from './components/CardEditor/CardEditor.jsx';
import PackExplorer from './components/PackExplorer/PackExplorer.jsx';
import ExportPdfModal from './components/Export/ExportPdfModal.jsx';
import ExportTokensPdfModal from './components/Export/ExportTokensPdfModal.jsx';
import ArtImporter from './components/ArtImporter/ArtImporter.jsx';
import TokenDesigner from './components/TokenDesigner/TokenDesigner.jsx';
import { useAppStore } from './store/useAppStore.js';
import { RefreshCw } from 'lucide-react';
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

  const initializeApp = useAppStore(state => state.initializeApp);
  const setActiveCard = useAppStore(state => state.setActiveCard);
  const setActiveToken = useAppStore(state => state.setActiveToken);
  const tokens = useAppStore(state => state.tokens);

  useEffect(() => {
    initializeApp();
  }, [initializeApp]);

  const handleOpenPdfExport = (cards, packName) => {
    setPdfExportCards(cards);
    setPdfExportPackName(packName);
    setPdfExportIsOpen(true);
  };

  const handleOpenTokensPdfExport = (packName) => {
    setTokensPdfExportPackName(packName);
    setTokensPdfExportIsOpen(true);
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
  };

  const exportPack = async (pack) => {
    const { dbGetCards } = await import('./services/db.js');
    const packCards = await dbGetCards(pack.id);
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({
      type: 'vale-pack',
      pack: pack,
      cards: packCards
    }, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `${pack.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_pack.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const exportEntireLibrary = async () => {
    const { dbGetPacks, dbGetCards } = await import('./services/db.js');
    const allPacks = await dbGetPacks();
    const allData = [];
    for (const pack of allPacks) {
      const pCards = await dbGetCards(pack.id);
      allData.push({ pack, cards: pCards });
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
        const parsed = JSON.parse(event.target.result);
        const { dbSavePack, dbSaveCard } = await import('./services/db.js');
        
        if (parsed.type === 'vale-pack') {
          const pack = parsed.pack;
          pack.createdAt = pack.createdAt || Date.now();
          await dbSavePack(pack);
          for (const card of parsed.cards) {
            await dbSaveCard(card);
          }
          alert(`Pack "${pack.name}" and ${parsed.cards.length} cards imported!`);
        } else if (parsed.type === 'vale-library') {
          for (const item of parsed.packs) {
            await dbSavePack(item.pack);
            for (const card of item.cards) {
              await dbSaveCard(card);
            }
          }
          alert('Entire library imported successfully!');
        } else {
          alert('Unknown file format.');
        }
        useAppStore.getState().loadPacks();
      } catch (err) {
        alert('Failed to parse JSON file: ' + err.message);
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
            onClick={() => setActiveTab('explorer')}
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
            onClick={() => setActiveTab('editor')}
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
            onClick={() => setActiveTab('tokens')}
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
            onExportPack={exportPack}
            onExportLibrary={exportEntireLibrary}
            onImportFile={handleImportFile}
            onOpenPdfExport={handleOpenPdfExport}
            onOpenTokensPdfExport={handleOpenTokensPdfExport}
          />
        )}

        {activeTab === 'tokens' && (
          <TokenDesigner onShowArtImporter={handleShowArtImporter} />
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
        tokens={tokens}
        packName={tokensPdfExportPackName}
      />
    </>
  );
}
