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

# Ensure sentence-transformers is installed for true local semantic RAG
install_and_import('sentence_transformers')
from sentence_transformers import SentenceTransformer, util

# List of 100 custom names and abilities for semantic synthesis
SYNTHETIC_NAMES = [
    "Abyssal Maw", "Aether Serpent", "Agate Guardian", "Amber Wasp", "Ancient Colossus",
    "Apex Wyrm", "Aquatic Sentinel", "Archon of Light", "Ashen Drake", "Astral Phoenix",
    "Basalt Golem", "Blaze Stag", "Blighted Stalker", "Bone Wyrm", "Bramble Warden",
    "Canyon Behemoth", "Cavern Lurker", "Celestial Archon", "Chimeran Wraith", "Cinder Wolf",
    "Cloud Sovereign", "Coral Hermit", "Cosmic Leviathan", "Crimson Reaver", "Cursed Revenant",
    "Dawn Herald", "Deepsea Lurker", "Desert Prowler", "Dune Stalker", "Dust Shaman",
    "Earthquake Turtle", "Eclipse Owl", "Emerald Viper", "Ember Lynx", "Ethereal Wraith",
    "Feral Panther", "Flame Djinn", "Forest Patriarch", "Frost Wyrm", "Gilded Sentinel",
    "Glacier Behemoth", "Grave Warden", "Gryphon Paragon", "Ironclad Tortoise", "Jade Crab",
    "Lava Archon", "Lightning Falcon", "Magma Turtle", "Meadow Muse", "Mirage Panther",
    "Mist Weaver", "Monolith Guardian", "Moss Colossus", "Nebula Whale", "Nightmare Steed",
    "Obsidian Golem", "Onyx Basilisk", "Peak Sovereign", "Petal Dancer", "Phantom Stag",
    "Plague Wasp", "Primordial Slime", "Pyroclastic Beast", "Quicksand Worm", "Radiant Archon",
    "Rift Walker", "River Nymph", "Rust Golem", "Sandstone Sphinx", "Scarlet Phoenix",
    "Scorch Scorpion", "Sea Serpent", "Shadow Stalker", "Silt Lurker", "Sky Monarch",
    "Slithering Naga", "Solar Lion", "Spectral Hound", "Spire Gargoyle", "Spore Druid",
    "Storm Archon", "Sunclaw Hawk", "Swamp Horror", "Tectonic Warden", "Tidal Leviathan",
    "Tomb Revenant", "Tundra Wolf", "Typhoon Drake", "Vapor Sprite", "Venomous Spider",
    "Volcanic Hydra", "Vortex Elemental", "Wasp Queen", "Whispering Willow", "Wild Dryad",
    "Wind Runner", "Wyvern Scout", "Zephyr Sprite", "Zenith Dragon", "Abyss Weaver"
]

SYNTHETIC_ABILITIES = [
    "Instant \\icon(Instant): Force an opponent to discard a card from their hand.",
    "Resolution \\icon(Active): Gain \\icon(Score, 2) if you control at least one \\icon(Water) card in your Area.",
    "Resolution \\icon(Active): Pay \\icon(Stone1) to recover a card from your discard pile to your hand.",
    "Permanent \\icon(Permanent): Your \\icon(Fire) cards cost \\icon(Stone1) less to summon.",
    "Instant \\icon(Instant): When this card is discarded from your Area, gain \\icon(Stone3).",
    "Instant \\icon(Instant): Double the resolution effect of an adjacent \\icon(Earth) card this round.",
    "Resolution \\icon(Active): Earn \\icon(Stone1) for each summoned card in your Area.",
    "Permanent \\icon(Permanent): Your active \\icon(Dragon) cards cannot be targeted by opponents' effects.",
    "Instant \\icon(Instant): Swap the positions of two cards in the draft zone.",
    "Resolution \\icon(Active): Discard a card from your hand to search the deck for a \\icon(Wind) card.",
    "Permanent \\icon(Permanent): Gain \\icon(Score, 1) for each card in your hand.",
    "Instant \\icon(Instant): All players return their cheapest summoned card to their hand.",
    "Permanent \\icon(Permanent): Whenever you sell a card, draw 1 card.",
    "Permanent \\icon(Permanent): At the start of the Resolution Phase, gain \\icon(Stone1) for each active \\icon(Dragon) card.",
    "Resolution \\icon(Active): Pay \\icon(Stone3) to prevent an opponent's card from activating this round.",
    "Instant \\icon(Instant): Add a card of cost 3 or less from the draft zone directly to your hand.",
    "Permanent \\icon(Permanent): Earth cards in your Area gain protection from removal effects.",
    "Permanent \\icon(Permanent): When this card is removed, return it to your hand instead of the discard pile.",
    "Resolution \\icon(Active): Discard a card from your hand to gain \\icon(Score, 3).",
    "Instant \\icon(Instant): Take a card from your discard pile and add it to your hand.",
    "Permanent \\icon(Permanent): Your \\icon(Wind) cards cost \\icon(Stone1) less to summon.",
    "Instant \\icon(Instant): Copy the passive effect of another active card in your Area.",
    "Resolution \\icon(Active): Exchange one \\icon(Stone1) for \\icon(Score, 3).",
    "Resolution \\icon(Active): Pay \\icon(Stone3) to recover this card to your hand.",
    "Instant \\icon(Instant): Each opponent must discard one card from their hand.",
    "Permanent \\icon(Permanent): Fire cards adjacent to this card cost \\icon(Stone1) less to summon.",
    "Instant \\icon(Instant): Look at the top three cards of the deck, then put them back in any order.",
    "Resolution \\icon(Active): Pay \\icon(Stone1) to exchange it for a \\icon(Stone3) from the supply.",
    "Permanent \\icon(Permanent): Your \\icon(Water) cards require \\icon(Stone1) less to summon.",
    "Instant \\icon(Instant): Choose a card in the draft zone; it cannot be tamed this round.",
    "Resolution \\icon(Active): Discard an \\icon(Earth) card from your hand to gain \\icon(Stone6).",
    "Permanent \\icon(Permanent): Dragon cards cost \\icon(Stone3) less to summon.",
    "Permanent \\icon(Permanent): Whenever you gain a \\icon(Stone6), gain \\icon(Score, 2).",
    "Resolution \\icon(Active): Draw a card, then discard a card from your hand.",
    "Resolution \\icon(Active): Pay \\icon(Stone3) to recover a card from your Area to your hand.",
    "Instant \\icon(Instant): Exchange hands with an opponent until the end of the round.",
    "Permanent \\icon(Permanent): Opponents cannot gain \\icon(Stone6) during the Resolution Phase.",
    "Instant \\icon(Instant): Gain control of an opponent's token or card of cost 2 or less.",
    "Resolution \\icon(Active): Discard this card to gain \\icon(Stone6) and \\icon(Stone3).",
    "Permanent \\icon(Permanent): Your summoned cards cannot be removed by opponent card effects.",
    "Permanent \\icon(Permanent): When this card is targeted by an opponent's card, pay \\icon(Stone1) to cancel it.",
    "Resolution \\icon(Active): Gain \\icon(Score, 1) for each unique family type present in your Area.",
    "Resolution \\icon(Active): Pay \\icon(Stone3) to gain \\icon(Score, 1) for each of your active \\icon(Fire) cards.",
    "Instant \\icon(Instant): Gain \\icon(Stone6) and discard a card from your hand.",
    "Permanent \\icon(Permanent): Dragon cards adjacent to this card gain \\icon(Score, 2) during resolution.",
    "Permanent \\icon(Permanent): When this card is discarded from your hand, draw 2 cards.",
    "Resolution \\icon(Active): Pay \\icon(Stone1) to change this card's family to \\icon(Water) or \\icon(Fire).",
    "Permanent \\icon(Permanent): Your cards of cost 5 or higher cost \\icon(Stone3) less to summon.",
    "Instant \\icon(Instant): Gain Magic Stones from the supply until you have 4 stones.",
    "Resolution \\icon(Active): Pay \\icon(Stone3) to look at an opponent's hand and discard one card.",
    "Resolution \\icon(Active): Discard a \\icon(Fire) card to search your discard pile for a \\icon(Fire) card.",
    "Permanent \\icon(Permanent): All players have a hard limit of 3 Magic Stones instead of 4.",
    "Instant \\icon(Instant): Draw a card for each active \\icon(Earth) card in your Area.",
    "Resolution \\icon(Active): Pay \\icon(Stone1) to gain \\icon(Score, 2).",
    "Permanent \\icon(Permanent): Your active cards are protected from automatic discard effects.",
    "Instant \\icon(Instant): Earn \\icon(Score, 1) for each card in your discard pile.",
    "Resolution \\icon(Active): Gain \\icon(Stone1) if your hand is completely empty.",
    "Resolution \\icon(Active): Pay \\icon(Stone6) to force all players to discard one summoned card.",
    "Permanent \\icon(Permanent): Your \\icon(Wind) cards can be resolved twice during the Resolution Phase.",
    "Instant \\icon(Instant): Search your deck for a card with the same summoning cost and reveal it.",
    "Resolution \\icon(Active): Discard this card from your Area to gain \\icon(Score, 6).",
    "Permanent \\icon(Permanent): Earth cards in your Area cannot be discarded by card effects.",
    "Permanent \\icon(Permanent): When this card is removed, choose an opponent; they must discard a card from their hand.",
    "Resolution \\icon(Active): Pay \\icon(Stone3) to swap this card with a card in your hand.",
    "Permanent \\icon(Permanent): Your \\icon(Water) cards gain \\icon(Score, 1) for each other \\icon(Water) card in your Area.",
    "Instant \\icon(Instant): Look at the top card of an opponent's deck and discard it if you choose.",
    "Resolution \\icon(Active): Discard a card from your hand to draw a card.",
    "Permanent \\icon(Permanent): If you control an active \\icon(Fire) card, this card gains \\icon(Score, 2) during resolution.",
    "Permanent \\icon(Permanent): Whenever you summon a card of cost 5 or more, gain \\icon(Score, 3).",
    "Resolution \\icon(Active): Gain \\icon(Stone1) for each card in your discard pile (max 3).",
    "Resolution \\icon(Active): Pay \\icon(Stone1) to swap the family of this card with another active card.",
    "Permanent \\icon(Permanent): Your active cards gain \\icon(Score, 1) for each active \\icon(Wind) card you control.",
    "Instant \\icon(Instant): Earn \\icon(Score, 3) immediately.",
    "Resolution \\icon(Active): Pay \\icon(Stone3) to reveal the opponent's hand.",
    "Permanent \\icon(Permanent): Fire cards cost \\icon(Stone1) more for all players to summon.",
    "Permanent \\icon(Permanent): When this card is targeted by an opponent's card, gain \\icon(Stone3).",
    "Resolution \\icon(Active): You may return this card to your hand to draw a card.",
    "Resolution \\icon(Active): Discard a \\icon(Water) card from hand to gain \\icon(Score, 4).",
    "Permanent \\icon(Permanent): Your active \\icon(Dragon) cards earn \\icon(Score, 2) more during resolution.",
    "Instant \\icon(Instant): Gain \\icon(Score, 2) if you have the most summoned cards in play.",
    "Resolution \\icon(Active): Pay \\icon(Stone1) to draw a card, then choose and discard a card.",
    "Permanent \\icon(Permanent): Your active cards of cost 2 or less gain \\icon(Score, 1) during resolution.",
    "Instant \\icon(Instant): An opponent's active card loses its permanent passive effect until end of round.",
    "Resolution \\icon(Active): Sacrifice this card to add a \\icon(Dragon) card from your deck to your hand.",
    "Permanent \\icon(Permanent): While you control this card, you do not draw cards during the draw phase.",
    "Permanent \\icon(Permanent): When this card is discarded from your hand, summon it to your Area for 0 cost.",
    "Resolution \\icon(Active): Gain \\icon(Stone1) if you control a summoned \\icon(Water) card.",
    "Resolution \\icon(Active): Pay \\icon(Stone3) to redirect an opponent's target effect to another card.",
    "Permanent \\icon(Permanent): Your active cards are immune to other players' Resolution Phase effects.",
    "Instant \\icon(Instant): Shuffle your discard pile back into your draw pile.",
    "Resolution \\icon(Active): Discard a summoned card from your Area to draw 3 cards.",
    "Permanent \\icon(Permanent): Your active \\icon(Earth) cards gain \\icon(Score, 2) during the Resolution Phase.",
    "Instant \\icon(Instant): Search your discard pile for a card and return it to your hand.",
    "Resolution \\icon(Active): Pay \\icon(Stone1) to gain \\icon(Score, 2).",
    "Permanent \\icon(Permanent): While you control another active \\icon(Dragon) card, this card cannot be removed.",
    "Permanent \\icon(Permanent): Whenever you draw a card, gain \\icon(Score, 1).",
    "Resolution \\icon(Active): Gain \\icon(Stone1) for each active \\icon(Water) card in your Area.",
    "Resolution \\icon(Active): Pay \\icon(Stone3) to copy the resolution effect of another active card.",
    "Permanent \\icon(Permanent): Your active \\icon(Fire) cards gain \\icon(Score, 1) during resolution.",
    "Instant \\icon(Instant): Search your deck for a card of cost 6 and add it to your hand."
]

def recommend_cards(card_json_str):
    try:
        input_card = json.loads(card_json_str)
    except Exception as e:
        print(json.dumps({"error": f"Invalid JSON inputs: {str(e)}"}), flush=True)
        return

    # Locate basecards.json
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
    
    # Initialize RAG model (all-MiniLM-L6-v2)
    print("Loading local semantic RAG embedding model...", file=sys.stderr, flush=True)
    model = SentenceTransformer("all-MiniLM-L6-v2")
    
    # Format database items for embedding
    db_texts = [f"{c['name']} ({c['family']}): cost {c['cost']}. {c['effect']}" for c in database]
    db_embeddings = model.encode(db_texts, convert_to_numpy=True)
    
    # Format user designed card for embedding
    input_text = f"{name} ({family}): cost {cost}. {effect}"
    input_embedding = model.encode(input_text, convert_to_numpy=True)
    
    # Calculate cosine similarities using numpy
    dot_products = np.dot(db_embeddings, input_embedding)
    db_norms = np.linalg.norm(db_embeddings, axis=1)
    input_norm = np.linalg.norm(input_embedding)
    similarities = dot_products / (db_norms * input_norm)
    
    # ── RAG EVALUATION & SYNERGY RANKING ──
    ranked_indices = np.argsort(similarities)[::-1]
    recommendations = []
    
    for idx in ranked_indices:
        card = database[idx]
        if card["name"].lower() == name.lower():
            continue
            
        score = float(similarities[idx])
        synergies = []
        
        # Add Rules-Augmented Synergy Boosters (RAR checks)
        c1_earns = "earn" in effect.lower() or "gain" in effect.lower()
        c2_pays = "pay" in card["effect"].lower() or "discard" in card["effect"].lower()
        c1_pays = "pay" in effect.lower() or "discard" in effect.lower()
        c2_earns = "earn" in card["effect"].lower() or "gain" in card["effect"].lower()
        
        if (c1_earns and c2_pays) or (c1_pays and c2_earns):
            score += 0.2
            synergies.append("Resource Generator & Spender synergy")
            
        if f"\\icon({family})" in card["effect"]:
            score += 0.3
            synergies.append(f"Requires {family} cards in play")
        if f"\\icon({card['family']})" in effect:
            score += 0.3
            synergies.append(f"Supports {card['family']} card alignments")
            
        if ("draw" in effect.lower() and "hand" in card["effect"].lower()) or \
           ("hand" in effect.lower() and "draw" in card["effect"].lower()):
            score += 0.15
            synergies.append("Card draw utility synergy")
            
        c1_recovers = "recover" in effect.lower()
        c2_instant = "instant" in card["effect"].lower()
        if c1_recovers and c2_instant:
            score += 0.25
            synergies.append("Recover & Instant summon loop")
            
        # Check cost conventions and bounds
        if card["family"] == family and abs(card["cost"] - cost) >= 3:
            score += 0.1
            synergies.append("Thematic Cost Curve complement")
            
        recommendations.append({
            "name": card["name"],
            "cost": card["cost"],
            "family": card["family"],
            "effect": card["effect"],
            "score": round(score, 3),
            "synergies": synergies if synergies else ["Semantic relationship"]
        })
        if len(recommendations) >= 5:
            break
            
    # Take top 2 RAG recommendations
    top_db_cards = recommendations[:2]
    
    # ── RETRIEVAL-AUGMENTED CONCEPT SYNTHESIS ──
    # Embed the custom name and ability pools to pick the most semantically synergistic combination!
    print("Synthesizing new unique card concepts via RAG retrieval...", file=sys.stderr, flush=True)
    name_embeddings = model.encode(SYNTHETIC_NAMES, convert_to_numpy=True)
    ability_embeddings = model.encode(SYNTHETIC_ABILITIES, convert_to_numpy=True)
    
    # Semantic match for names (related to family and theme)
    name_scores = np.dot(name_embeddings, input_embedding) / (np.linalg.norm(name_embeddings, axis=1) * input_norm)
    best_name_idx = np.argmax(name_scores)
    generated_name = SYNTHETIC_NAMES[best_name_idx]
    
    # Semantic match for abilities (related to card effect mechanics)
    ability_scores = np.dot(ability_embeddings, input_embedding) / (np.linalg.norm(ability_embeddings, axis=1) * input_norm)
    # Pick the top ability that matches the mechanics semantic intent
    best_ability_idx = np.argmax(ability_scores)
    generated_ability = SYNTHETIC_ABILITIES[best_ability_idx]
    
    # Balance rules cost pricing matching family trends in database
    family_costs = [c["cost"] for c in database if c["family"] == family]
    if family_costs:
        generated_cost = int(np.round(np.mean(family_costs)))
    else:
        generated_cost = random.choice([2, 3, 4])
        
    custom_concept = {
        "name": f"Ancient {generated_name.split()[-1]}" if len(generated_name.split()) > 1 else f"Spectral {generated_name}",
        "cost": generated_cost,
        "family": family,
        "effect": generated_ability,
        "score": 1.0,
        "synergies": [f"Procedurally synthesized RAG concept for {family} balance matching"]
    }
    
    # Combine outputs: 1 RAG synthesized card concept + 2 RAG database matches
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
