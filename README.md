# The Vale of Eternity: Card Creator

A desktop application for designing, managing, and printing custom creature cards for the card-drafting board game *The Vale of Eternity*. Built with React + Vite and packaged as a standalone Windows app via **Neutralinojs**.

---

## ⬇️ Download & Install (For Players)

> **You don't need to know anything about coding to use this.** Just download and run!

1. Go to the **[Releases page](../../releases/latest)** of this repository (look for the "Releases" section on the right side of the GitHub page, or click the link above).
2. Under **Assets**, download **`vale-of-eternity.exe`** — a portable executable. No installation required.

3. **If Windows shows a security warning** ("Windows protected your PC"), click **More info** → **Run anyway**. This is normal for apps that don't have a paid code-signing certificate — the app is safe.

4. That's it! The app will open. Your cards and packs are saved automatically on your computer.

> **First-time AI features** (background removal, upscaling & RAG card suggestions) require an internet connection to download AI model files (~30–50 MB total). This only happens once — after that, everything works offline.

> [!WARNING]
> **Upgrading from v1.3.1 or earlier?** The app has been rebuilt from Electron to **Neutralinojs** starting in v1.3.2. The pack storage format is **not compatible** between the two environments. Before upgrading, open the old version and use **Export Pack (`.voe-pack`)** in the Pack Explorer to back up all your packs. Then re-import them in the new version using **Import Pack**.

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
- **Random card generator** — generates a semantically unique card using the RAG AI concept engine (when running in Neutralino desktop mode). Falls back to the 100-name × 100-ability pool in browser mode. Warns if there are unsaved changes before generating.
- **Save to Pack** — save the active card design to any pack in the local database.
- **Overwrite** — re-save an existing card; warns if another card in the pack already shares the same name.
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
- **AI Upscale** (separate) — uses **RealESR-AnimeVideo-v3_x4** (ONNX via Python sidecar) to upscale low-resolution art 4× before final placement.

**AI Card Concept Sidebar** (runs while the pipeline processes)
- Displays a live scrolling carousel of **5 unique card concepts** generated by the **RAG (Retrieval-Augmented Generation)** engine using a local `all-MiniLM-L6-v2` semantic embedding model.
- Concepts span all 5 families (Fire, Water, Earth, Wind, Dragon), each with balanced costs, thematically-named abilities, and realistic icons.
- After 3 full rotations, the engine silently pre-fetches a fresh batch of 5 new concepts in the background — seamless, infinite inspiration.

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

### 🪙 Token Designer (Tokens Tab)
- **Design custom tokens** — fully integrated canvas drawing, shapes, webcam capture, and file imports.
- **Pre-processing pipeline** — includes perspective correction, background removal, upscaling, tinting, and adjustments.
- **Transparent backing** — tokens save with clear backgrounds.
- **Automatic bounding box detection** — scans canvas pixels to capture the tightest crop boundary (`bbox`) and saves cropped target frames (`croppedDataUrl`).

### 🗺️ Board Component Designer (Components Tab)
- **Design custom board components** — boards, score trackers, tiles, and more on a fully configurable canvas with bleed margins and fold-line guides.
- **Multiple layer types** — Drawing, Fill, Image, Text, and Grid layers, each independently adjustable with opacity controls and reordering.
- **Built-in rulers and bleed guides** — physical size in mm with a red bleed safety margin overlay and configurable fold lines.
- **Integrated Art tools** — same Art Integrator pipeline (scan → enhance → paint → place) available for Image layers, plus a Quick Upload option for direct file loading.
- **Pan & Zoom** — scroll to zoom, click-drag or select the Pan tool to navigate; zoom +/− buttons and a fit-to-screen reset.
- **Export to PDF** — centered (one component per page, auto-orientation) or tiled grid layout. Supports bleed boundary and fold-line overlays in the output.
- **Export to Packs** — bundle components into a named pack for organized storage and batch printing.

### 🎴 Token Overlay Placement & Inline Icons
- **Interactive Drag & Drop** — drag placed tokens directly on the card preview layout for quick positioning.
- **Precision Sliders** — calibrate X/Y coordinates (`cx`, `cy`) and size (`cqw`) using smooth range sliders.
- **Text Insertion** — click shortcut toolbar buttons to place `\icon(token_name)` inside card effects. They render inline with timing symbols, auto-cropped to the token's tight bounding box.

### 📦 Pack Explorer (Explorer Tab)
- **Pack management** — create, rename, and delete card packs.
- **Card & token libraries** — browse cards and custom tokens within a pack.
- **Search and filter** — search by name, filter by family, filter by cost, sort by name/cost/family/date.
- **Actions** — edit (load cards/tokens into designers), duplicate/clone, move to other packs, delete.
- **Export Cards to PDF** — export all filtered cards in the pack as multi-page print-ready PDFs (with batch size control).
- **Export Tokens to PDF** — open configure dialog to print custom tokens with adjustable base sizes, gaps, and quantities.
- **Import/Export Pack (`.voe-pack`)** — export whole packs (cards, tokens, board components, and artwork) as a single file, and import them with automatic ID collision mapping and inline icon reference mapping.

### 🖨️ Print-Ready PDF Export
All PDFs are exported as lossless **PNG images** for print-quality output.

- **Cards Sheet**:
  - Standard card size: **63.5 × 88 mm** (standard card game size).
  - **3 × 3 grid** per page (9 cards/page) with centered margins and **2 mm gutters**.
  - **Custom Paper Sizes** — choose between **A4** ($210 \times 297\text{ mm}$) and **US Letter** ($215.9 \times 279.4\text{ mm}$) with automatic grid centering to ensure perfect print margins on both sizes.
  - **Duplex Alignment Options** — select **Flip Long Edge (Horizontal)**, **Flip Short Edge (Vertical)**, or **No Flip** to match your printer's double-sided settings.
  - **Artwork Direction** — only card slot positions are mirrored on the backside sheet; the artwork itself remains upright and is not mirrored, keeping text/logos readable.
  - Thin light-gray **cutting guide lines** around each card slot.
  - **Fronts Only** and **Duplex** (mirrored backsides) print options.
  - **Configurable batch size** — set how many cards per output file (default 18 = 2 sheets). When the pack exceeds this limit, multiple numbered PDFs are automatically produced (`_part1.pdf`, `_part2.pdf`, …). This prevents memory crashes with large packs.
  - ⚠️ A warning is shown when batch size exceeds 27 cards (3 pages).
- **Tokens Sheet**:
  - Standalone printing of custom-shaped tokens on A4 sheets.
  - Automatic wrapping flow based on token bounding boxes, chosen base size (`20mm`–`60mm`), and margins (`2mm`–`10mm`).
  - Lightweight guide lines around bounding boxes to assist scissors/cutting.
  - Print multi-copy counts per token.
- **Components Sheet**:
  - **Centered** — one component per A4 page, auto-oriented (portrait/landscape).
  - **Tiled Grid** — components flow across pages with configurable spacing.
  - Optional **bleed boundary** (red dashed) and **fold line** (blue dashed) overlays in the PDF.

---

## 🛠️ Technical Stack

| Layer | Technology |
|---|---|
| Framework | React 18 + Vite 5 |
| Desktop wrapper | **Neutralinojs 4.15** (lightweight native bridge) |
| Styling | Vanilla CSS (custom properties, glassmorphism, animations) |
| Database | IndexedDB (browser-native, persisted locally) |
| PDF export | jsPDF + html2canvas (lossless PNG) |
| Art scanning | jscanify (OpenCV.js) for perspective correction |
| AI background removal | Hugging Face Transformers.js — `Xenova/modnet` (WASM, client-side) |
| AI upscaling | Python sidecar — **RealESR-AnimeVideo-v3_x4** ONNX via `onnxruntime` |
| AI card concepts | Python sidecar — **`all-MiniLM-L6-v2`** via `sentence-transformers` (local RAG) |
| Image processing | Canvas API (shadow balance, line enhancement, flood fill) |

> **AI model files are NOT bundled.** They are downloaded automatically from HuggingFace on first use (~30 MB for background removal, ~16 MB for upscaling) and cached in `%APPDATA%/vale-of-eternity/models`. An internet connection is required for this first-time download only.

---

## 🚀 Running Locally (Development)

```bash
# Install dependencies
npm install

# Start Vite dev server in browser only (no native APIs)
npm run dev
# → http://localhost:3000

# Start full Neutralino desktop app + Vite hot-reload simultaneously
npm run neu:dev
```

> **Note:** Native AI features (upscaling, background removal, RAG concepts) require running via `npm run neu:dev` or the built `.exe`. They will gracefully degrade to browser fallbacks in `npm run dev`.

---

## 📦 Building the Desktop App

```bash
# Build Vite + package into Neutralino .exe
npm run neu:build
```

The distributable executable is placed in `dist/vale-of-eternity.exe`. It is fully portable — no installation required.

---

## 📁 Project Structure

```
├── electron/
│   └── vale_ai.py        # Python AI sidecar (background removal, upscaling, RAG concepts)
├── public/
│   ├── fonts/            # Game fonts (NorseBold, TitanOne, MerriweatherSans, Roboto)
│   ├── basecards.json    # Official 70-card database (used by RAG engine)
│   └── img/
│       ├── Background/   # Card background templates per family
│       ├── Backside/     # Card backside template
│       ├── TextIcon/     # Timing and resource icons
│       └── ...
├── src/
│   ├── App.jsx                     # Main application shell and tab routing
│   ├── components/
│   │   ├── ArtImporter/            # Art pipeline modal (scan → enhance → paint → place)
│   │   ├── CardEditor/             # Card designer and live preview
│   │   ├── ComponentDesigner/      # Board component designer (layers, pan/zoom, export)
│   │   ├── Export/                 # PDF export modals (cards, tokens, components)
│   │   ├── PackExplorer/           # Pack browser, search, and card/token management
│   │   └── TokenDesigner/          # Token canvas designer
│   ├── store/
│   │   └── useAppStore.js          # Global state (IndexedDB, packs, cards, tokens, components)
│   ├── utils/
│   │   ├── pythonRunner.js         # Neutralino sidecar bridge (upscale, remove-bg, RAG)
│   │   └── pdfUtils.js             # Chunked PDF generation (cards, tokens, components)
│   ├── index.css                   # Design system tokens and global styles
│   └── main.jsx                    # React entry point
├── neutralino.config.json          # Neutralinojs configuration
├── index.html
├── vite.config.js
└── package.json
```

---

## 🗺️ Future Roadmap

### ✅ Released
- [x] Custom token designer
- [x] Custom board component designer
- [x] v1.3.0 — Pack import/export as `.voe-pack` JSON (sharing cards, tokens, and components)
- [x] v1.3.0 — PDF duplex printing alignment, custom paper sizes (A4/Letter), and backside mirroring
- [x] v1.3.1 — Local Python AI sidecar (background removal, upscaling), RAG card concept generator
- [x] v1.3.2 — Migrated from Electron to Neutralinojs, multi-family RAG concepts (5-card carousel), RAG-powered random card generator

### 🔜 v1.4.0 — Custom Families
- [ ] Custom family creator — define new families with custom names, colors, and background art

### 📋 Planned
- [ ] Rulebook page editor with export to matching print layout
- [ ] Undo/redo history

### 💭 Backlog / Under Consideration
- [ ] Customize existing family visuals (recolor, replace background templates)
- [ ] Online pack gallery / community sharing hub
