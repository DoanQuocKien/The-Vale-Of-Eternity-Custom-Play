# The Vale of Eternity: Card Creator

A desktop application for designing, managing, and printing custom creature cards for the card-drafting board game *The Vale of Eternity*. Built with React + Vite and packaged as a standalone Windows app via Electron.

---

## 📖 Game Context

Based on the official rules of *The Vale of Eternity*, each creature card follows a strict mechanical and visual anatomy:

| Element | Description |
|---|---|
| **Summoning Cost** | Numeric value in the top-left area |
| **Family** | Card type with a colored identity (Fire, Water, Earth, Wind, Dragon) |
| **Creature Name** | Displayed across the center divider |
| **Timing Type** | ⚡ Instant · ♾️ Permanent · ⏳ Active |
| **Effect Text** | Mechanical description of the card's ability |
| **Concept Art** | Creature illustration behind the card frame |
| **Credit Line** | Artist attribution near the bottom |

### Families
| Family | Playstyle | Default Sell Value |
|---|---|---|
| 🔥 Fire | Cheap actions & Red Stone utilization | 3 Red Stones |
| 💧 Water | Utility, resource generation & Blue Stones | 1 Blue Stone (3 units) |
| 🌿 Earth | High-scoring & Purple Stone manipulation | 4 Red Stones |
| 💨 Wind | Hand management & card advantage | 1 Red + 1 Blue Stone |
| 🐉 Dragon | Ultimate high-investment, high-reward | 1 Purple Stone (6 units) |

---

## ✨ Features

### 🎨 Interactive Card Designer (Editor Tab)
- **Live card preview** at 63.5 × 88 mm proportions with full zoom support.
- Edit **Name**, **Summoning Cost**, **Effect Text** (multi-line, with timing icons), and **Credit Line**.
- **5 Family backgrounds** (Fire, Water, Earth, Wind, Dragon) with family-appropriate color theming for price indicators.
- **Preset cards** for quick inspiration — includes sample cards from each family.
- **Random card generator** — generates a random card with name, family, cost, effects and credits.
- **Save to Pack** — save the active card design to any pack in the local database.
- **Load from Pack** — double-click a card in Pack Explorer to load it back into the editor.
- **Element layout controls** — fine-tune position and font size of each card element (name, prices, effect box, credit line) with per-family overrides.
- **Export Card to PDF** — export the current card as a print-ready PDF (63.5 × 88 mm on A4, with optional duplex backside).

### 🖼️ Art Integrator (Multi-Step Workflow)
A dedicated multi-stage art processing pipeline, opened via the "Set Art" button in the editor:

**Stage 0 — Import**
- **Upload** an existing image (sketch, photo, digital art).
- **Webcam capture** — take a photo directly in the app.
- **Draw from scratch** — opens a blank canvas sized to the card art safe zone (1728 × 2414 px).

**Stage 1 — Deskew**
- Automatic perspective correction using **jscanify** (OpenCV.js) to straighten photos of hand-drawn art taken at an angle.

**Stage 2 — AI Processing Pipeline** (each step individually skippable)
- **Shadow Balance** — divide-by-background algorithm to normalize uneven lighting.
- **Line Art Enhancement** — darkens and sharpens faint pencil/ink lines.
- **Flood Fill Extraction** — flood-fill from border to detect and erase the background outside the line art, leaving only the drawing with a transparent background.
- **AI Background Removal** (separate) — uses the `Xenova/modnet` model via Hugging Face Transformers.js (WASM, runs entirely client-side). Requires an internet connection on first use to download the model (~30 MB, cached after that).
- **AI Upscale** (separate) — uses ESRGAN to upscale low-resolution art before final placement.

**Stage 3 — Color Tuning & Painting**
- Color tuning sliders: **Brightness**, **Contrast**, **Vibrance**, **Hue Rotate**, **Family Tint**, **Luma Key** (transparency by brightness).
- Full painting canvas with zoom (1px–200%) and pan (hold Space + drag):
  - **Brush** — freehand painting with color picker, opacity slider, and adjustable size (1–200px).
  - **Eraser** — erase pixels (transparency).
  - **Restore** — restore pixels from the original deskewed image using a brush.
  - **Line** — draw straight lines.
  - **Rectangle** — draw filled/outlined rectangles.
  - **Circle** — draw filled/outlined ellipses.
  - **Polygon** — click to place vertices, close on first point to commit.
  - **Text** — place text with a custom string and font size.

**Stage 4 — Placement**
- Position and scale the processed art on the card preview.
- Drag to reposition; sliders for scale and rotation.

### 📦 Pack Explorer (Explorer Tab)
- **Pack management** — create, rename, and delete card packs.
- **Card library** — browse all saved cards within a pack.
- **Search and filter** — search by name, filter by family, filter by cost, sort by name/cost/family/date.
- **Card actions** — edit (load into editor), duplicate, move to another pack, delete.
- **Export Pack to PDF** — export all filtered cards in the pack as a multi-page print-ready PDF.

### 🖨️ Print-Ready PDF Export
- Standard card size: **63.5 × 88 mm** (standard card game size).
- **3 × 3 grid** per A4 page (9 cards/page) with centered margins.
- **2 mm gutters** between cards for clean separation.
- Thin light-gray **cutting guide lines** around each card slot.
- **Fronts Only mode** — single-sided sheet of card fronts.
- **Duplex mode** — alternates front pages with horizontally-mirrored back pages for perfect two-sided printing alignment.

---

## 🛠️ Technical Stack

| Layer | Technology |
|---|---|
| Framework | React 18 + Vite 5 |
| Desktop wrapper | Electron 35 + electron-builder |
| Styling | Vanilla CSS (custom properties, glassmorphism, animations) |
| Database | IndexedDB (browser-native, persisted locally) |
| PDF export | jsPDF + html2canvas |
| Art scanning | jscanify (OpenCV.js) for perspective correction |
| AI background removal | Hugging Face Transformers.js — `Xenova/modnet` (WASM, client-side) |
| AI upscaling | UpscalerJS — ESRGAN Medium (WASM, client-side) |
| Image processing | Canvas API (shadow balance, line enhancement, flood fill) |

> **AI model files are NOT bundled in the installer.** They are downloaded automatically from HuggingFace CDN on first use (~30 MB for background removal) and cached locally. An internet connection is required for this first-time download only.

---

## 🚀 Running Locally (Development)

```bash
# Install dependencies
npm install

# Start Vite dev server (browser)
npm run dev
# → http://localhost:3000
```

---

## 📦 Building the Desktop App

```bash
# Launch in Electron (uses the built dist/)
npm run electron:dev

# Build Windows installer + portable exe into release/
npm run electron:build
```

The installer will be created in `release/`. Two formats are produced:
- `The Vale of Eternity - Card Creator Setup.exe` — NSIS installer with Start Menu and Desktop shortcuts.
- `The Vale of Eternity - Card Creator.exe` — Portable single-file exe (no install required).

---

## 📁 Project Structure

```
├── electron/
│   ├── main.cjs          # Electron main process
│   └── preload.cjs       # Context bridge preload
├── public/
│   ├── fonts/            # Game fonts (NorseBold, TitanOne, MerriweatherSans, Roboto)
│   └── img/
│       ├── Background/   # Card background templates per family
│       ├── Backside/     # Card backside template
│       ├── TextIcon/     # Timing and resource icons
│       └── ...
├── src/
│   ├── App.jsx           # Main application (designer, pack explorer, PDF export)
│   ├── ArtImporter.jsx   # Art pipeline modal (scan → enhance → paint → place)
│   ├── index.css         # Design system tokens and global styles
│   ├── main.jsx          # React entry point
│   └── workers/
│       ├── bgRemoval.worker.js   # Web Worker: AI background removal (Transformers.js)
│       └── upscale.worker.js     # Web Worker: AI upscaling (UpscalerJS / ESRGAN)
├── index.html
├── vite.config.js
└── package.json
```

---

## 🗺️ Future Roadmap

- [ ] Custom token sheet designer (Magic Stones, status markers)
- [ ] Rulebook page editor with export to matching layout
- [ ] Standee and board component designer
- [ ] Card import/export as JSON for sharing between users
- [ ] Undo/redo history in the Art Integrator
