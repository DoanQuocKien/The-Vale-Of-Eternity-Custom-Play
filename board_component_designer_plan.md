# 🗃️ Custom Board Component Designer — Implementation Plan

> **Goal**: Add a new "Components" tab to the Vale of Eternity Card Creator that lets users design, save, and export print-ready board components (player boards, resource tracks, scoring tracks, tiles, punch-out pieces) — all living in the same pack system as cards and tokens.

---

## Overview & Guiding Philosophy

Break the work into **5 self-contained phases**, each of which is independently useful and shippable. Never try to build the entire system at once. Each phase ends with something you can actually run, test, and use.

---

## Phase 1 — Data Foundation & DB Layer
**Difficulty:** 🟢 Easy | **Estimated effort:** Half a day

The component data model and persistence layer. Nothing visual yet — just the data plumbing that every other phase builds on.

### Goals
- Define the `BoardComponent` schema
- Wire up IndexedDB CRUD in `db.js`
- Add Zustand store actions in `useAppStore.js`
- Add a new `'components'` tab entry in `App.jsx` (renders placeholder)

### `BoardComponent` schema
```js
{
  id: 'comp-<timestamp>',
  packId: '<packId>',
  name: 'My Player Board',
  type: 'board' | 'track' | 'tile' | 'tile-sheet' | 'freeform',
  widthMm: 210,      // physical width in mm
  heightMm: 148,     // physical height in mm
  bleedMm: 3,        // bleed zone width in mm
  canvasData: null,  // base64 PNG of canvas content
  layers: [],        // reserved for Phase 3 layer system
  createdAt: 0,
  updatedAt: 0
}
```

### Tasks
- [x] Add `dbGetComponents`, `dbSaveComponent`, `dbDeleteComponent` to `src/services/db.js`
- [x] Add `components`, `activeComponent`, `loadComponents`, `saveComponent`, `deleteComponent` to `useAppStore.js`
- [x] Add `'components'` tab button in `App.jsx` (renders `<div>Coming soon</div>` for now)
- [x] Add `loadComponents` call inside `setActivePackId` alongside `loadTokens`

### Why first?
Every subsequent phase reads/writes this schema. Getting it right — especially `widthMm`/`heightMm` in physical mm — saves painful migrations later.

---

## Phase 2 — Canvas Viewer & Basic Drawing
**Difficulty:** 🟡 Medium | **Estimated effort:** 1–2 days

A working canvas at the correct physical scale with the basic drawing tools copied from `TokenDesigner`. No layers, no shapes library yet — just a proof-of-concept you can draw on and save.

### Goals
- Create `src/components/ComponentDesigner/ComponentDesigner.jsx`
- Show a canvas scaled to the component's `widthMm × heightMm` at the user's screen zoom
- Support **Brush**, **Eraser**, **Rectangle**, **Circle**, **Line**, **Text** tools (port from `TokenDesigner`)
- **Save to Pack** — persist `canvasData` (PNG) via `saveComponent`

### Key decisions to make
- **Canvas resolution**: Use `widthMm × 11.811` → px (400 DPI). e.g. 210 mm → 2480 px wide. This matches the standard print-quality resolution used in card export.
- **Viewport scaling**: Display at `windowWidth / canvasWidthPx`. Use CSS `transform: scale()` on a wrapper div. Same approach as `TokenDesigner`'s zoom system.
- **Component type picker**: On "New Component", show a quick-select modal:
  - 🟦 Player Board (A4 landscape: 297 × 210 mm)
  - 📏 Resource Track (148 × 55 mm)
  - 🔲 Tile (63.5 × 63.5 mm, square)
  - 🎴 Tile Sheet (A4: 210 × 297 mm — for punch-outs)
  - 📐 Custom (user inputs mm dimensions)

### Tasks
- [x] Create `src/components/ComponentDesigner/` folder
- [x] Build `ComponentDesigner.jsx` with left panel (tools) + center (canvas) + right panel (properties)
- [x] Port drawing tools from `TokenDesigner.jsx` (they share `canvasUtils.js` already)
- [x] Add physical-size display: show ruler ticks in mm along canvas edges
- [x] Add "New Component" modal with type picker and dimension inputs
- [x] Implement Save to Pack → `useAppStore.saveComponent()`
- [x] Mount `<ComponentDesigner />` in `App.jsx` on `activeTab === 'components'`

### Reuse from existing code
- `canvasUtils.js` → `drawShape()` already handles all basic shapes
- `TokenDesigner.jsx` → zoom/pan logic, color picker, tool button styles
- `useAppStore` → pack selector, save/load pattern

---

## Phase 3 — Layers & Overlay Elements
**Difficulty:** 🔴 Hard | **Estimated effort:** 2–3 days

This is the hard phase. Board components need **multiple layers** (background fill, art/image layer, text elements, grid/track cells). Implement a simple layer stack system.

### Goals
- **Layer panel** (sidebar list): add, remove, reorder, toggle visibility, rename
- **Layer types**: `fill` | `image` | `text` | `grid` | `drawing`
- Each layer renders to its own offscreen canvas and is composited on save
- **Grid/Track builder** — the killer feature for resource tracks and tile sheets:
  - Define rows × columns, cell size in mm, gap in mm
  - Auto-generates a grid overlay (numbers each cell optionally)
  - Cells can be individually labeled

### Layer schema
```js
{
  id: 'layer-<timestamp>',
  type: 'fill' | 'image' | 'text' | 'grid' | 'drawing',
  name: 'Background',
  visible: true,
  opacity: 1.0,
  // type-specific config:
  fillColor: '#3b82f6',       // for 'fill'
  imageDataUrl: null,          // for 'image'
  text: 'Round Track',         // for 'text'
  fontFamily: 'NorseBold',     // for 'text' — matches game fonts
  fontSize: 48,                // for 'text', in canvas px
  gridRows: 10,                // for 'grid'
  gridCols: 1,                 // for 'grid'
  cellLabels: [],              // for 'grid', array of strings
  drawingData: null,           // for 'drawing', PNG base64
}
```

### Tasks
- [x] Add `layers[]` to `BoardComponent` schema and migration in `db.js`
- [x] Build `LayerPanel.jsx` — sidebar list with add/remove/reorder/visibility
- [x] Build compositor function: renders all visible layers in order onto a single offscreen canvas → returns final `ImageData`
- [x] Build `GridLayerEditor.jsx` — rows × cols inputs, cell size (mm), gap, label list
- [x] Integrate game fonts (`NorseBold`, `TitanOne`) into text layers via CSS `@font-face` already loaded in `index.css`
- [x] Update Save to run compositor and store result as `canvasData`

### Why separate from Phase 2?
Phase 2 gives you a working single-canvas tool immediately. Layers are architecturally significant — they touch Save, Load, the canvas render loop, and the UI. Doing them separately avoids a painful rewrite of a half-finished system.

---

## Phase 4 — Art Integration & Pre-processing
**Difficulty:** 🟡 Medium | **Estimated effort:** 1 day

Plug the existing Art Integrator pipeline into the Component Designer. Components need art too — heraldry, icons, board artwork.

### Goals
- "Set Art" button on any `image` layer → opens `ArtImporter` in component mode
- Reuse `isTokenMode` flag (or add `isComponentMode`) to disable card-specific constraints
- Placed art fills the image layer's bounding region (user can drag/scale within the layer)

### Tasks
- [x] Add `isComponentMode: true` to `ArtImporter` props in `App.jsx` when called from ComponentDesigner
- [x] In `ArtImporter`, skip card-frame crop constraints when `isComponentMode` is true
- [x] On art confirmation, set the `imageDataUrl` of the target image layer
- [x] Add per-layer drag-to-reposition and scale slider (same as Art Integrator Stage 4, scoped to the layer bounds)

### Reuse
- `ArtImporter` already accepts `isTokenMode` to adjust behavior — extend this pattern
- `handleShowArtImporter` / `artCallback` pattern in `App.jsx` is already generic

---

## Phase 5 — PDF Export & Pack Explorer Integration
**Difficulty:** 🟡 Medium | **Estimated effort:** 1 day

Make components printable and visible in the Pack Explorer.

### Goals
- **Export single component to PDF** — exact mm dimensions, bleed zone lines, fold guides
- **Export tile sheet to PDF** — multi-component layout on A4 (flow-wrapping tiles like token export)
- **Pack Explorer** — show components in their own section alongside cards and tokens

### PDF export spec
| Component type | Sheet layout |
|---|---|
| Player board (A4 landscape) | 1 per A4 page, centered, bleed guides |
| Tiles / track segments | Flow-wrapped on A4, with cut guides around each tile |
| Tile sheet (A4) | 1 per A4 page |

### Tasks
- [ ] Add `exportComponentToPdf(component)` in `src/utils/pdfUtils.js`
  - Use `jsPDF` with mm units (already used for cards)
  - Draw component canvas at physical mm size
  - Draw bleed-zone dashed rectangle
  - Draw fold-line guides (dashed, configurable in component settings)
- [ ] Add `exportTileSheetToPdf(components[])` for batch tile export
  - Reuse token-export flow-wrapping logic from `ExportTokensPdfModal.jsx`
- [ ] Add `ExportComponentsPdfModal.jsx` — configure bleed (mm), add/remove fold guides, choose duplex
- [ ] Pack Explorer: add "Components" sub-section to the existing pack view
  - Thumbnail grid of saved components (render `canvasData`)
  - Edit / Duplicate / Delete / Move actions (same pattern as tokens)
- [ ] Add components export/import to the existing JSON pack export in `App.jsx`

---

## Recommended Build Order Summary

```
Phase 1 (DB + Store)     → ~4 hrs  → Components exist in the database
Phase 2 (Canvas + Draw)  → ~2 days → You can draw and save a component
Phase 3 (Layers)         → ~3 days → Full layer system, grid builder
Phase 4 (Art Integrator) → ~1 day  → Art placement on components
Phase 5 (PDF + Explorer) → ~1 day  → Print-ready and discoverable in packs
```

**Total estimate: ~8–10 focused development days**

---

## Files Touched Per Phase

| File | P1 | P2 | P3 | P4 | P5 |
|---|---|---|---|---|---|
| `src/services/db.js` | ✅ | — | ✅ (migration) | — | — |
| `src/store/useAppStore.js` | ✅ | — | — | — | — |
| `src/App.jsx` | ✅ (tab) | ✅ (mount) | — | ✅ (artImporter) | ✅ (export modal) |
| `src/utils/pdfUtils.js` | — | — | — | — | ✅ |
| `src/utils/canvasUtils.js` | — | 🔄 reuse | 🔄 reuse | — | — |
| `src/components/ComponentDesigner/ComponentDesigner.jsx` | — | **NEW** | ✅ | ✅ | — |
| `src/components/ComponentDesigner/LayerPanel.jsx` | — | — | **NEW** | — | — |
| `src/components/ComponentDesigner/GridLayerEditor.jsx` | — | — | **NEW** | — | — |
| `src/components/Export/ExportComponentsPdfModal.jsx` | — | — | — | — | **NEW** |
| `src/components/PackExplorer/PackExplorer.jsx` | — | — | — | — | ✅ |

---

## Open Questions / Decisions Before Starting

> [!IMPORTANT]
> **Q1 — Canvas resolution**: 400 DPI (matching print quality) means a Player Board canvas is 4677 × 3307 px. This is a large canvas. Is performance acceptable, or should we use 150 DPI for the editor and upscale only on export?
Keep the DPI.

> [!IMPORTANT]
> **Q2 — Layer scope for Phase 2**: Should Phase 2 skip layers entirely (single flat canvas, like a simplified TokenDesigner) and defer layers fully to Phase 3? This makes Phase 2 much simpler but means a refactor in Phase 3.
No.

> [!NOTE]
> **Q3 — Game font licensing**: `NorseBold` and `TitanOne` are already loaded via `public/fonts/`. Text layers on components can use them freely — no new font loading needed.
Agree.

> [!NOTE]
> **Q4 — Fold lines**: Does the game's player board have a fold (for a standing component)? If yes, Phase 5 needs a fold-line guide option. If components are always flat, skip this.
User-defined.
