import sys
import os
import json
import subprocess
import urllib.request
import math

# Ensure we have clean stdout flushing for real-time progress bars in UI
def print_progress(percent):
    print(f"Downloading: {percent}%", flush=True)

def download_model_with_progress(url, dest_path):
    os.makedirs(os.path.dirname(dest_path), exist_ok=True)
    print(f"Downloading model from {url}...")
    
    last_reported = -1
    def report_hook(block_num, block_size, total_size):
        nonlocal last_reported
        if total_size > 0:
            percent = int(block_num * block_size * 100 / total_size)
            percent = min(100, percent)
            if percent != last_reported:
                print_progress(percent)
                last_reported = percent
            
    try:
        urllib.request.urlretrieve(url, dest_path, reporthook=report_hook)
        print("Download complete.", flush=True)
    except Exception as e:
        print(f"Download failed: {str(e)}", flush=True)
        if os.path.exists(dest_path):
            os.remove(dest_path)
        raise e

# Pre-download check runner
def ensure_model(model_name, url, dest_folder):
    dest_path = os.path.join(dest_folder, model_name)
    if not os.path.exists(dest_path):
        try:
            download_model_with_progress(url, dest_path)
        except Exception as e:
            sys.exit(1)
    return dest_path

is_frozen = getattr(sys, 'frozen', False)

def install_and_import(package, pip_name=None):
    try:
        __import__(package)
    except ImportError as e:
        if is_frozen:
            print(f"Error: Required package '{package}' is missing from compiled binary: {str(e)}")
            sys.exit(1)
        else:
            name = pip_name if pip_name else package
            print(f"Installing {name}...")
            subprocess.check_call([sys.executable, "-m", "pip", "install", name])

# Load base python packages
install_and_import('numpy')
install_and_import('cv2', 'opencv-python')
install_and_import('PIL', 'pillow')
install_and_import('onnxruntime')

import cv2
import numpy as np
from PIL import Image

# ── 1. BACKGROUND REMOVAL (rembg) ──
def remove_background(input_path, output_path):
    install_and_import('rembg')
    import rembg
    
    # Pre-download U2Net weights to prevent silent blocks
    u2net_home = os.environ.get("U2NET_HOME", os.path.expanduser(os.path.join("~", ".u2net")))
    ensure_model(
        "u2net.onnx",
        "https://github.com/danielgatis/rembg/releases/download/v0.0.0/u2net.onnx",
        u2net_home
    )
    
    img = Image.open(input_path)
    output = rembg.remove(img)
    output.save(output_path)
    print("Background removal completed.", flush=True)

# ── 2. SMART AI UPSCALING (Real-ESRGAN Anime Video v3) ──
def upscale_image(input_path, output_path):
    import onnxruntime as ort
    
    # Download RealESRGAN model if not present (~16MB)
    app_data = os.environ.get("APPDATA", os.path.expanduser("~"))
    model_folder = os.path.join(app_data, "vale-of-eternity", "models")
    model_file = "realesr-animevideov3.onnx"
    model_url = "https://github.com/c43721/TRT-Real-ESRGAN/releases/download/models/realesr-animevideov3-x2.onnx"
    
    model_path = ensure_model(model_file, model_url, model_folder)
    
    # Load model and run inference
    print("Loading upscaler model...")
    session = ort.InferenceSession(model_path, providers=['CPUExecutionProvider'])
    
    img = cv2.imread(input_path)
    h, w, c = img.shape
    
    # Preprocess image: normalize to 0-1, transpose to CHW, add batch dimension
    img_in = img.astype(np.float32) / 255.0
    img_in = np.transpose(img_in, (2, 0, 1))
    img_in = np.expand_dims(img_in, axis=0)
    
    input_name = session.get_inputs()[0].name
    output_name = session.get_outputs()[0].name
    
    print("Running upscaler neural network...")
    # Inference outputs [1, 3, H*2, W*2]
    ort_outs = session.run([output_name], {input_name: img_in})
    output_img = ort_outs[0][0]
    
    # Postprocess: transpose back to HWC, clip, and multiply back to 0-255
    output_img = np.transpose(output_img, (1, 2, 0))
    output_img = (output_img * 255.0).clip(0, 255).astype(np.uint8)
    
    cv2.imwrite(output_path, output_img)
    print("Upscale completed.", flush=True)

# ── 3. SHADOW BALANCE (CLAHE + Bilateral) ──
def balance_lighting(input_path, output_path):
    img = cv2.imread(input_path)
    
    # Convert to LAB space to isolate luminance channel (preserves colors perfectly)
    lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)
    
    # Apply CLAHE to balance shadows and highlights dynamically
    clahe = cv2.createCLAHE(clipLimit=2.5, tileGridSize=(8, 8))
    cl = clahe.apply(l)
    
    # Merge channels and convert back
    merged = cv2.merge((cl, a, b))
    balanced = cv2.cvtColor(merged, cv2.COLOR_LAB2BGR)
    
    # Bilateral smoothing to denoise shadow areas while keeping sharp edges
    smoothed = cv2.bilateralFilter(balanced, 7, 50, 50)
    
    cv2.imwrite(output_path, smoothed)
    print("Balance lighting completed.", flush=True)

# ── 4. LINE ART ENHANCEMENT (XDoG) ──
def enhance_lines(input_path, output_path):
    img = cv2.imread(input_path)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    gray = gray.astype(np.float32) / 255.0
    
    # Parameters for Extended Difference of Gaussians (XDoG)
    sigma = 0.4
    k = 1.6
    tau = 0.98
    epsilon = 0.01
    phi = 12.0
    
    # Apply blurs
    blur1 = cv2.GaussianBlur(gray, (0, 0), sigma)
    blur2 = cv2.GaussianBlur(gray, (0, 0), sigma * k)
    
    # Difference of Gaussians
    dog = blur1 - tau * blur2
    
    # Apply soft thresholding function
    xdog_img = np.zeros_like(dog)
    for y in range(dog.shape[0]):
        for x in range(dog.shape[1]):
            val = dog[y, x]
            if val < epsilon:
                xdog_img[y, x] = 1.0
            else:
                xdog_img[y, x] = 1.0 + np.tanh(phi * (val - epsilon))
                
    # Normalize back to BGR image scale
    xdog_img = (xdog_img * 255.0).clip(0, 255).astype(np.uint8)
    
    # Combine back with original to enhance outlines without losing background colors
    color_mask = cv2.cvtColor(xdog_img, cv2.COLOR_GRAY2BGR)
    enhanced = cv2.multiply(img, color_mask, scale=1.0/255.0)
    
    cv2.imwrite(output_path, enhanced)
    print("Line enhancement completed.", flush=True)

# ── 5. LOCAL RAG RECOMMENDATION ENGINE (Rules-Augmented Retrieval - RAR) ──

# Thematic vocabularies and mechanical builders matching the official rulebook conventions
THEME_VOCABS = {
    "Fire": {
        "prefixes": ["Ashen", "Blazing", "Cinder", "Ember", "Infernal", "Lava", "Magma", "Pyre", "Volcanic", "Scorch"],
        "suffixes": ["Djinn", "Phoenix", "Wolf", "Drake", "Giant", "Salamander", "Stag", "Specter", "Acolyte", "Warden"],
        "abilities": [
            "Instant \\icon(Instant): Earn two \\icon(Stone1). Recover one card from your discard pile to your hand.",
            "Active \\icon(Active): Pay one \\icon(Stone1) to recover another card in your Area to your hand.",
            "Instant \\icon(Instant): If you control another \\icon(Fire) card, earn three \\icon(Stone1).",
            "Permanent \\icon(Permanent): Your \\icon(Fire) cards cost \\icon(Stone1) less to summon.",
            "Active \\icon(Active): Discard one \\icon(Stone1), then gain \\icon(Score, 3)."
        ],
        "costs": [0, 1, 2, 3]
    },
    "Water": {
        "prefixes": ["Aquatic", "Coral", "Deepsea", "Glacial", "River", "Tidal", "Vapor", "Oceanic", "Tsunami", "Abyssal"],
        "suffixes": ["Hermit", "Leviathan", "Nymph", "Sprite", "Serpent", "Crab", "Maw", "Sentinel", "Kelpie", "Kraken"],
        "abilities": [
            "Active \\icon(Active): Exchange three \\icon(Stone1) for one \\icon(Stone6).",
            "Instant \\icon(Instant): Gain two \\icon(Stone3) from the supply.",
            "Permanent \\icon(Permanent): Your active \\icon(Water) cards gain \\icon(Score, 1) during the Resolution Phase.",
            "Active \\icon(Active): Swap all of your \\icon(Stone1) for \\icon(Stone3) from the supply.",
            "Instant \\icon(Instant): Gain \\icon(Stone3) and resolve this card's Active effect immediately."
        ],
        "costs": [1, 2, 3, 4]
    },
    "Earth": {
        "prefixes": ["Agate", "Amber", "Ancient", "Basalt", "Bramble", "Canyon", "Cavern", "Mossy", "Stone", "Tectonic"],
        "suffixes": ["Golem", "Guardian", "Warden", "Tortoise", "Colossus", "Behemoth", "Lurker", "Slab", "Gargoyle", "Dryad"],
        "abilities": [
            "Active \\icon(Active): Discard one card from your hand to gain \\icon(Score, 5).",
            "Active \\icon(Active): Pay one \\icon(Stone6) to gain \\icon(Score, 6).",
            "Instant \\icon(Instant): Lose \\icon(Score, 2) to draw two cards immediately.",
            "Active \\icon(Active): If you have exactly four cards in your Area, gain \\icon(Score, 10).",
            "Instant \\icon(Instant): Pay one \\icon(Stone6) to draft a card directly from the pool."
        ],
        "costs": [2, 3, 4, 5]
    },
    "Wind": {
        "prefixes": ["Astral", "Cloud", "Zephyr", "Lightning", "Mist", "Stormy", "Typhoon", "Gryphon", "Apex", "Vortex"],
        "suffixes": ["Monarch", "Falcon", "Hawk", "Runner", "Sprite", "Drake", "Sovereign", "Muse", "Zephyr", "Weaver"],
        "abilities": [
            "Permanent \\icon(Permanent): Gain \\icon(Score, 1) for each card in your hand during resolution.",
            "Instant \\icon(Instant): Draw two cards, then discard one card.",
            "Permanent \\icon(Permanent): Whenever you summon a card, draw one card.",
            "Active \\icon(Active): Draw one card, then gain \\icon(Score, 2).",
            "Permanent \\icon(Permanent): Your \\icon(Wind) cards cost \\icon(Stone1) less to summon."
        ],
        "costs": [3, 4, 5]
    },
    "Dragon": {
        "prefixes": ["Apex", "Bone", "Gilded", "Zenith", "Eternal", "Cursed", "Radiant", "Ironclad", "Spectral", "Cosmic"],
        "suffixes": ["Wyrm", "Dragon", "Sovereign", "Paragon", "Wyvern", "Monarch", "Behemoth", "Horror", "Wrath", "Emperor"],
        "abilities": [
            "Instant \\icon(Instant): Earn \\icon(Score, 6) immediately.",
            "Instant \\icon(Instant): Force all opponents to discard one card from their hand.",
            "Instant \\icon(Instant): Discard one card from your Area to gain \\icon(Score, 8).",
            "Instant \\icon(Instant): Search the deck for any card and add it to your hand.",
            "Instant \\icon(Instant): Swap the family of all cards in your Area to \\icon(Dragon)."
        ],
        "costs": [5, 6]
    }
}

import random

def recommend_cards(card_json_str):
    try:
        input_card = json.loads(card_json_str)
    except Exception as e:
        print(json.dumps({"error": f"Invalid JSON inputs: {str(e)}"}), flush=True)
        return

    # Locate basecards.json (prefer public/ source directory, fallback to dist/ build directory)
    script_dir = os.path.dirname(os.path.abspath(__file__))
    basecards_path = os.path.abspath(os.path.join(script_dir, "..", "public", "basecards.json"))
    
    if not os.path.exists(basecards_path):
        basecards_path = os.path.abspath(os.path.join(script_dir, "..", "dist", "basecards.json"))
        
    if not os.path.exists(basecards_path):
        print(json.dumps({"error": f"Base cards file not found at: {basecards_path} or in public/ directory."}), flush=True)
        return
        
    with open(basecards_path, "r", encoding="utf-8") as f:
        database = json.load(f)
        
    # Extract properties of designed card
    name = input_card.get("name", "").strip()
    cost = int(input_card.get("cost", 0))
    family = input_card.get("family", "Water").strip()
    effect = input_card.get("effect", "").strip()
    
    # Synthesize 1 completely new, theme-accurate and synergistic creature card
    # Synergy mapping: matches input element with complementary mechanical archetypes
    if family == "Fire":
        # Fire (cheap, Stone1, recover) -> Pair with Wind (card draws) or more Fire (recursion loops)
        target_family = random.choice(["Wind", "Fire"])
        synergy_note = "Draw helper for Fire area / cheap recursion summon loop"
    elif family == "Water":
        # Water (Stone3, stone economy) -> Pair with Earth (Stone6 scorers) or more Water (converters)
        target_family = random.choice(["Earth", "Water"])
        synergy_note = "Stones converter / Spends Water resource to score points"
    elif family == "Earth":
        # Earth (high risk, high scorer) -> Pair with Water (economy backup) or Dragon (heavy instant score)
        target_family = random.choice(["Water", "Dragon"])
        synergy_note = "High efficiency converter / Complementary high-end force"
    elif family == "Wind":
        # Wind (draw, utility) -> Pair with Fire (cheap summons) or Earth (discard scorers)
        target_family = random.choice(["Fire", "Earth"])
        synergy_note = "Card size synergy / Converts card draws into score rewards"
    else: # Dragon
        # Dragon (one-time high-end) -> Pair with Water (converters) or Fire (cheap recovery)
        target_family = random.choice(["Water", "Fire"])
        synergy_note = "Stone generator to fund high Dragon summon costs"
        
    theme = THEME_VOCABS[target_family]
    prefix = random.choice(theme["prefixes"])
    suffix = random.choice(theme["suffixes"])
    generated_name = f"{prefix} {suffix}"
    generated_ability = random.choice(theme["abilities"])
    generated_cost = random.choice(theme["costs"])
    
    custom_concept = {
        "name": generated_name,
        "cost": generated_cost,
        "family": target_family,
        "effect": generated_ability,
        "score": 9.9, # Prioritized first
        "synergies": [synergy_note]
    }
    
    # Tokenize input card text for simple keyword semantic matching
    def clean_tokens(text):
        cleaned = text.lower().replace("\\icon", "").replace("(", "").replace(")", "").replace(":", "")
        return set(cleaned.split())

    input_tokens = clean_tokens(effect)
    
    # Evaluate candidates
    recommendations = []
    
    for card in database:
        # Avoid recommending itself
        if card["name"].lower() == name.lower():
            continue
            
        score = 0.0
        synergies = []
        
        # 1. Semantic keyword match (TF-IDF equivalent)
        card_tokens = clean_tokens(card["effect"])
        overlap = input_tokens.intersection(card_tokens)
        score += len(overlap) * 0.4
        
        # 2. Strict Game Mechanics Synergy rules
        c1_earns = "earn" in effect.lower() or "gain" in effect.lower()
        c2_pays = "pay" in card["effect"].lower() or "discard" in card["effect"].lower()
        c1_pays = "pay" in effect.lower() or "discard" in effect.lower()
        c2_earns = "earn" in card["effect"].lower() or "gain" in card["effect"].lower()
        
        if (c1_earns and c2_pays) or (c1_pays and c2_earns):
            score += 2.0
            synergies.append("Resource Generator & Consumer Loop")
            
        if f"\\icon({family})" in card["effect"]:
            score += 3.0
            synergies.append(f"Direct Family synergy with {family} alignment")
        if f"\\icon({card['family']})" in effect:
            score += 3.0
            synergies.append(f"Supports {card['family']} card alignments")
            
        if ("draw" in effect.lower() and "hand" in card["effect"].lower()) or \
           ("hand" in effect.lower() and "draw" in card["effect"].lower()):
            score += 1.5
            synergies.append("Hand size scaling synergy")
            
        c1_recovers = "recover" in effect.lower()
        c2_instant = "instant" in card["effect"].lower()
        if c1_recovers and c2_instant:
            score += 2.5
            synergies.append("Recover & Instant summon loop synergy")
            
        if card["family"] == family and abs(card["cost"] - cost) >= 3:
            score += 1.0
            synergies.append("Optimizes cost diversity in family area")
            
        if score > 0:
            recommendations.append({
                "name": card["name"],
                "cost": card["cost"],
                "family": card["family"],
                "effect": card["effect"],
                "score": round(score, 2),
                "synergies": synergies if synergies else ["General keyword match"]
            })
            
    # Sort descending by score and pick top 2 real database cards
    recommendations.sort(key=lambda x: x["score"], reverse=True)
    top_db_cards = recommendations[:2]
    
    # Merge custom concept card at the top, followed by base database recommendations
    final_output = [custom_concept] + top_db_cards
    
    print(json.dumps(final_output, indent=2, ensure_ascii=False), flush=True)

# ── MAIN ROUTING CLI ──
if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python vale_ai.py <subcommand> [args...]", flush=True)
        sys.exit(1)
        
    subcommand = sys.argv[1]
    
    if subcommand == "remove-bg":
        if len(sys.argv) < 4:
            print("Usage: python vale_ai.py remove-bg <input> <output>", flush=True)
            sys.exit(1)
        remove_background(sys.argv[2], sys.argv[3])
        
    elif subcommand == "upscale":
        if len(sys.argv) < 4:
            print("Usage: python vale_ai.py upscale <input> <output>", flush=True)
            sys.exit(1)
        upscale_image(sys.argv[2], sys.argv[3])
        
    elif subcommand == "balance-lighting":
        if len(sys.argv) < 4:
            print("Usage: python vale_ai.py balance-lighting <input> <output>", flush=True)
            sys.exit(1)
        balance_lighting(sys.argv[2], sys.argv[3])
        
    elif subcommand == "enhance-lines":
        if len(sys.argv) < 4:
            print("Usage: python vale_ai.py enhance-lines <input> <output>", flush=True)
            sys.exit(1)
        enhance_lines(sys.argv[2], sys.argv[3])
        
    elif subcommand == "recommend":
        if len(sys.argv) < 3:
            print("Usage: python vale_ai.py recommend <card_json>", flush=True)
            sys.exit(1)
        recommend_cards(sys.argv[2])
        
    else:
        print(f"Unknown subcommand: {subcommand}", flush=True)
        sys.exit(1)
