# The Vale of Eternity: Custom Card & Component Designer

An interactive web application designed to help creators design, manage, and print custom creature cards, rules, tokens, and standees for the card-drafting board game *The Vale of Eternity*.

---

## 📖 Game Context & Design Reference

Based on the official rules of *The Vale of Eternity*, cards follow a strict mechanical and visual anatomy. The designer program will enforce and assist with these conventions:

### 1. Card Anatomy
* **Summoning Cost:** A numeric value in the top-left area.
* **Family Emblem & Alignment:** Colored icons in the topmost left corner:
  * 🔥 **Fire:** Cheap card actions, resource management, and Red Stones utilization. *Default Sell Value: 3 Red Stones (3 units)*
  * 💧 **Water:** Centered around utility, resource generation, and Blue Stones utilization. *Default Sell Value: 1 Blue Stone (3 units)*
  * 🌿 **Earth:** Focuses on high-scoring capability, resource manipulation, high sell values, and Purple Stones utilization. *Default Sell Value: 4 Red Stones (4 units)*
  * 💨 **Wind:** Grants hand manipulation, card advantage, and general support. *Default Sell Value: 1 Red Stone and 1 Blue Stone (4 units)*
  * 🐉 **Dragon:** The ultimate high-tier creatures, demanding heavy investment but offering massive rewards. *Default Sell Value: 1 Purple Stone (6 units)*
* **Creature Name:** Displayed horizontally across the center divider.
* **Timing & Ability Type:** Prioritized visual icons before effect text:
  * ⚡ **Instant Effect:** Triggers once at the moment of summoning.
  * ♾️ **Permanent Effect:** Constant passive rules modification.
  * ⏳ **Active Effect:** Triggers once per Resolution Phase.
* **Effect Text:** Clear description of the card's mechanics.
* **Concept Art:** An illustration area showing the creature.

---

## 🚀 Key Features

Our step-by-step implementation will cover three primary functional modules:

### 1. Interactive Card Creator
* **Dynamic Card Layout:** A pixel-perfect, live-updating visual preview of the card front and back.
* **Family Customization:** Select from the 5 standard families (Fire, Water, Earth, Wind, Dragon) or define custom families with custom emblems and colors.
* **Ability Customizer:** Formulate Summoning Costs, Timing types (⚡, ♾️, ⏳), and format the effect text.
* **Concept Art Integrator:**
  * Drag-and-drop or select local images.
  * Auto-cropping, centering, and scale fitting.
  * **AI Art Detection:** A utility to identify typical AI-generated signatures (either through metadata analysis, client-side ML models, or heuristic checks) to help curators catalog art sources.

### 2. Design Manager & Pack Publisher
* **Local Storage:** Save active drafts and finished card designs directly to the browser (IndexedDB) or export/import them as JSON files.
* **Packs & Sets Management:** Group related card designs into custom expansion packs (e.g., themed synergies) or nested folders of packs.
* **Print-Ready PDF Exporter:**
  * Assemble standalone cards or complete card packs.
  * Generate high-quality PDFs with precise front-and-back alignments.
  * Custom configurations for printing (bleed zones, crop marks, standard card size of 88mm x 63mm).

### 3. Custom Rules & Accessories (Future Expansion)
* **Rulebook Editor:** Write custom expansion rulepages that export to matching layouts.
* **Token Creator:** Design custom Magic Stones or specialized status markers.
* **Standee & Board Designer:** Visual layout grids to customize the center board, standees, and player boards.

---

## 🛠️ Technical Stack & Architecture

To deliver a high-quality, lightweight, and performant local application, we will use the following tech stack:

* **Framework:** React + Vite (for modular state management, swift rendering, and hot reloading).
* **Styling:** Vanilla CSS (Custom properties, CSS grid, flexbox, glassmorphism, and transitions) to design a premium, dark-themed visual experience without the bloat of external libraries.
* **Graphics & Layouts:** SVG & Canvas API to generate pixel-perfect high-resolution card frames and compile printable sheets.
* **PDF Engine:** `pdf-lib` or `jspdf` to dynamically construct vector PDFs directly in the browser.
* **Database:** IndexedDB (via `idb` or `localforage`) for local-first draft tracking.

---

## 🗺️ Step-by-Step Roadmap

### Step 1: Base Configuration & Mockups
* Initialize the Vite project and build the CSS custom-property design system.
* Establish the live HTML card template matching the game's exact aspect ratio and regions.

### Step 2: Live Editor Panel
* Add input controls for Name, Family, Cost, Timing, and Effect Text.
* Support image upload with a canvas-based scaling/crop tool.
* Implement a client-side heuristic-based metadata reader to inspect file sources (AI Art detection start).

### Step 3: Local Database & Pack Manager
* Integrate IndexedDB to save designs.
* Build the Pack Explorer UI to group, rename, move, and edit cards.

### Step 4: Export Engine
* Develop the grid arrangement algorithm for printing.
* Build the PDF assembler supporting double-sided duplex layouts.

### Step 5: Advanced Customizer (Later Features)
* Add custom boards, token sheets, and rules documentation tools.
