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
    model_file = "RealESR-AnimeVideo-v3_x4.onnx"
    model_url = "https://huggingface.co/tidus2102/Real-ESRGAN/resolve/main/RealESR-AnimeVideo-v3_x4.onnx"
    
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
    import re
    import random
    
    FAMILY_COST_LIMITS = {
        "Fire": {"min": 0, "max": 4},
        "Water": {"min": 0, "max": 7},
        "Earth": {"min": 0, "max": 10},
        "Wind": {"min": 3, "max": 10},
        "Dragon": {"min": 3, "max": 12}
    }
    
    try:
        input_card = json.loads(card_json_str)
    except Exception as e:
        print(json.dumps({"error": f"Invalid JSON inputs: {str(e)}"}), flush=True)
        return

    name = input_card.get("name", "").strip()
    cost = int(input_card.get("cost", 0))
    family = input_card.get("family", "Water").strip()
    effect = input_card.get("effect", "").strip()
    
    print("Loading local semantic RAG embedding model...", file=sys.stderr, flush=True)
    model = SentenceTransformer("all-MiniLM-L6-v2")
    
    input_text = f"{name} ({family}): cost {cost}. {effect}"
    input_embedding = model.encode(input_text, convert_to_numpy=True)
    input_norm = np.linalg.norm(input_embedding)
    
    print("Synthesizing 5 unique cross-family card concepts via RAG retrieval...", file=sys.stderr, flush=True)
    name_embeddings = model.encode(SYNTHETIC_NAMES, convert_to_numpy=True)
    ability_embeddings = model.encode(SYNTHETIC_ABILITIES, convert_to_numpy=True)
    
    name_scores = np.dot(name_embeddings, input_embedding) / (np.linalg.norm(name_embeddings, axis=1) * input_norm)
    top_name_indices = np.argsort(name_scores)[::-1][:25].tolist()
    
    ability_scores = np.dot(ability_embeddings, input_embedding) / (np.linalg.norm(ability_embeddings, axis=1) * input_norm)
    top_ability_indices = np.argsort(ability_scores)[::-1][:25].tolist()
    
    chosen_name_indices = random.sample(top_name_indices, 5)
    chosen_ability_indices = random.sample(top_ability_indices, 5)
    
    all_families = ["Fire", "Water", "Earth", "Wind", "Dragon"]
    other_families = [f for f in all_families if f != family]
    random.shuffle(other_families)
    concept_families = [family] + other_families
    
    final_output = []
    
    family_themes = {
        "Fire": ["Blaze", "Cinder", "Ember", "Flame", "Lava", "Magma", "Pyro", "Volcanic", "Ash", "Scorch"],
        "Water": ["Aquatic", "Coral", "Deepsea", "Glacier", "Mist", "River", "Sea", "Tidal", "Vapor", "Abyssal"],
        "Earth": ["Agate", "Ancient", "Basalt", "Bramble", "Canyon", "Earthquake", "Emerald", "Monolith", "Moss", "Obsidian", "Onyx", "Tectonic"],
        "Wind": ["Aether", "Astral", "Cloud", "Lightning", "Storm", "Typhoon", "Vortex", "Wind", "Zephyr", "Sky", "Gryphon"],
        "Dragon": ["Apex", "Archon", "Bone", "Dragon", "Drake", "Hydra", "Peak", "Wyrm", "Wyvern", "Zenith"]
    }
    
    for idx in range(5):
        concept_family = concept_families[idx]
        name_idx = chosen_name_indices[idx]
        ability_idx = chosen_ability_indices[idx]
        
        base_name = SYNTHETIC_NAMES[name_idx]
        theme_word = random.choice(family_themes.get(concept_family, ["Spectral"]))
        noun = base_name.split()[-1]
        name_str = f"{theme_word} {noun}"
        
        ability_str = SYNTHETIC_ABILITIES[ability_idx]
        
        def replace_family_icon(match):
            return f"\\icon({random.choice([concept_family, family])})"
        ability_str = re.sub(r"\\icon\((Water|Fire|Earth|Wind|Dragon)\)", replace_family_icon, ability_str)
        
        def randomize_score(match):
            return f"\\icon(Score, {random.randint(1, 4)})"
        ability_str = re.sub(r"\\icon\(Score,\s*\d+\)", randomize_score, ability_str)
        
        def randomize_stones(match):
            return f"\\icon({random.choice(['Stone1', 'Stone3', 'Stone6'])})"
        ability_str = re.sub(r"\\icon\(Stone\d+\)", randomize_stones, ability_str)
        
        limits = FAMILY_COST_LIMITS.get(concept_family, {"min": 1, "max": 6})
        cost_val = random.randint(limits["min"], limits["max"])
        
        final_score = float(ability_scores[ability_idx] * 0.7 + name_scores[name_idx] * 0.3)
        
        concept_card = {
            "name": name_str,
            "cost": cost_val,
            "family": concept_family,
            "effect": ability_str,
            "score": round(final_score, 3)
        }
        final_output.append(concept_card)
        
    print(json.dumps(final_output, indent=2, ensure_ascii=False), flush=True)

def generate_random_card():
    import re
    import random
    
    FAMILY_COST_LIMITS = {
        "Fire": {"min": 0, "max": 4},
        "Water": {"min": 0, "max": 7},
        "Earth": {"min": 0, "max": 10},
        "Wind": {"min": 3, "max": 10},
        "Dragon": {"min": 3, "max": 12}
    }
    
    family = random.choice(list(FAMILY_COST_LIMITS.keys()))
    base_name = random.choice(SYNTHETIC_NAMES)
    base_ability = random.choice(SYNTHETIC_ABILITIES)
    
    family_themes = {
        "Fire": ["Blaze", "Cinder", "Ember", "Flame", "Lava", "Magma", "Pyro", "Volcanic", "Ash", "Scorch"],
        "Water": ["Aquatic", "Coral", "Deepsea", "Glacier", "Mist", "River", "Sea", "Tidal", "Vapor", "Abyssal"],
        "Earth": ["Agate", "Ancient", "Basalt", "Bramble", "Canyon", "Earthquake", "Emerald", "Monolith", "Moss", "Obsidian", "Onyx", "Tectonic"],
        "Wind": ["Aether", "Astral", "Cloud", "Lightning", "Storm", "Typhoon", "Vortex", "Wind", "Zephyr", "Sky", "Gryphon"],
        "Dragon": ["Apex", "Archon", "Bone", "Dragon", "Drake", "Hydra", "Peak", "Wyrm", "Wyvern", "Zenith"]
    }
    
    theme_word = random.choice(family_themes.get(family, ["Spectral"]))
    noun = base_name.split()[-1]
    name_str = f"{theme_word} {noun}"
    
    ability_str = base_ability
    
    def replace_family_icon(match):
        return f"\\icon({family})"
    ability_str = re.sub(r"\\icon\((Water|Fire|Earth|Wind|Dragon)\)", replace_family_icon, ability_str)
    
    def randomize_score(match):
        return f"\\icon(Score, {random.randint(1, 4)})"
    ability_str = re.sub(r"\\icon\(Score,\s*\d+\)", randomize_score, ability_str)
    
    def randomize_stones(match):
        return f"\\icon({random.choice(['Stone1', 'Stone3', 'Stone6'])})"
    ability_str = re.sub(r"\\icon\(Stone\d+\)", randomize_stones, ability_str)
    
    limits = FAMILY_COST_LIMITS.get(family, {"min": 1, "max": 6})
    cost_val = random.randint(limits["min"], limits["max"])
    
    output_card = {
        "name": name_str,
        "cost": cost_val,
        "family": family,
        "effect": ability_str
    }
    
    print(json.dumps(output_card, indent=2, ensure_ascii=False), flush=True)


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

    elif subcommand == "random-card":
        generate_random_card()

    else:
        print(f"Unknown subcommand: {subcommand}", flush=True)
        sys.exit(1)
