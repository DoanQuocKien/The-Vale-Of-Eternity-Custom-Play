The Vale of Eternity (VoE) Art Implementation Blueprint
## Technical Specification & Integration Rules for Card Background Templates

This document outlines the standardized **Art Implementation Rules** for integrating character, monster, asset, or landscape illustrations onto card background templates. This blueprint provides generalized math, layering architecture, and alignment systems applicable across all elemental, faction, or generic template variants within the card system.

---

## 1. Core Canvas & Layering Hierarchy

To ensure high-fidelity prints and clean digital presentation, all background templates utilize a consistent canvas size and strict layer stack.

### 1.1 Canvas Specifications
* **Dimensions:** 1728 × 2414 pixels
* **Aspect Ratio:** 1:1.397 (Standard VoE aspect ratio optimized for high-res screen displays and physical print standard 2.5" × 3.5" at ~680 DPI)
* **Color Profile:** RGB (Digital) / CMYK-ready (Print-safe Gamut)

### 1.2 The Standard 3-Layer Stack
When implementing or creating artwork, the layout engine or software project must strictly adhere to this three-tier stack:

```
▲ Top Layer:    [FRAME & CARD METADATA] 
                - Borders, Card Text Frames, Rarity Gems, Text Box Graphics
                - Dynamic Cutouts (e.g., Top-Left or Bottom-Right emblem regions)

■ Middle Layer: [USER / ARTIST ILLUSTRATION] 
                - The subject art (Character, Spell effect, Weapon, Scene)
                - Masked or bounded to the inner canvas

▼ Bottom Layer: [THE BACKGROUND TEMPLATE] (e.g., AirCard.png)
                - Environmental textures, elemental swirls, abstract gradients
```

*Rule:* **Never** merge the Illustration directly onto the Background template prior to placing the Frame. Keeping the illustration on a middle layer allows the Frame layer to naturally mask out raw edges, creating a seamless asset bleed.

---

## 2. Dynamic Zone Mapping & Math System

Templates often feature decorative frames, asymmetry, and decorative "cutouts" (such as the circular element indicators in opposite corners). To generalize this across any background, we divide the canvas into three distinct zones based on normalized percentage-based bounding boxes.

```
(0,0) ──────────────────────────────────────────────────────── (1728,0)
│  [ ZONE A: Top Corner Cutout ]                              │
│  (Typically 0% to 18.5% Width, 0% to 26.5% Height)           │
│                                                              │
│        ──────────────────────────────────────────────        │
│        │                                            │        │
│        │              ZONE C: SAFE ZONE             │        │
│        │           (Ideal Focal Area)               │        │
│        │                                            │        │
│        ──────────────────────────────────────────────        │
│                                                              │
│                              [ ZONE B: Bottom Corner Cutout ]│
│                              (Typically 70% to 100% Width)   │
(0,2414) ────────────────────────────────────────────────── (1728,2414)
```

### 2.1 Zone A & B: Cutout & Overlay Obstructions
Many templates utilize asymmetrical corners for element emblems (e.g., top-left and bottom-right). 
* **Zone A (Top-Left Cutout Box):** From `(0, 0)` extending to `(320, 640)`. 
    * *Mathematical Rule:* `X_max = 0.185 × Total_Width`, `Y_max = 0.265 × Total_Height`.
* **Zone B (Bottom-Right Cutout Box):** From `(1200, 2150)` extending to `(1728, 2414)`.
    * *Mathematical Rule:* `X_min = 0.694 × Total_Width`, `Y_min = 0.890 × Total_Height`.

### 2.2 Zone C: The Global Safe Zone
To ensure the focal point of the artwork (the character's face, a glowing relic, a spell burst) is never obscured by borders, cutouts, or UI text boxes, it must sit entirely within the **Global Safe Zone**.

* **X-Axis Guardrails:** Keep primary visual weight between `X = 320` and `X = 1400`.
* **Y-Axis Guardrails:** Keep primary visual weight between `Y = 200` and `Y = 2100`.
* **Ideal Optical Focal Center:** The absolute visual target for the subject is **`(864, 1150)`**. This point accounts for typical text placement overlays at the bottom and badge weight at the top.

---

## 3. Artwork Bleed & Clipping Rules

To avoid unsightly blank gaps or untextured white lines near the inner border edges due to canvas misalignment, artwork must leverage a **Full Bleed System** underneath the Frame layer.

1.  **Inner Frame Bounding Dimensions:** The visible background portal spans roughly from `X = 74` to `X = 1654` and `Y = 94` to `Y = 2320`.
2.  **The Overscan Rule:** Artists should deliver art files that completely fill a **`1580 × 2226`** rectangle (or the full `1728 × 2414` canvas if transparency is not maintained).
3.  **Compositional Scaling:** * Do **not** tightly crop the character or subject to the inner border lines.
    * Allow spell effects, weapons, hair, or secondary scenery elements to bleed past the inner frame edges. Because the template frame sits on top, these trailing edges will cleanly tuck behind the frame, mimicking high-production VoE physics.

---

## 4. Artists' Checklist & Submission Checklist

When building or reviewing an art asset intended for these background templates, cross-verify against this quick reference guide:

- [ ] **Canvas Integrity:** The file must match exactly `1728 × 2414` pixels if submitted as a combined asset, or a minimum of `1580 × 2226` if submitted as an isolated foreground file.
- [ ] **Focal Clearance:** The core storytelling element or character face does not enter the Top-Left quadrant `(0 to 320X, 0 to 640Y)` or the Bottom-Right quadrant `(1200 to 1728X, 2150 to 2414Y)`.
- [ ] **Layer Autonomy:** Foreground elements are preserved on transparent or layered formats (`.psd`, `.tiff`, or transparent `.png`) to allow easy color grading or parallax adjustment against the background swirl textures.
- [ ] **Contrast Verification:** The illustration's color palette balances well against the background's intrinsic tone (e.g., highly saturated subjects stand out beautifully against softer, painterly background vortexes like the Air variant).
