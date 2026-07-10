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
    # Open with PIL to preserve alpha channel (cv2.imread drops alpha)
    pil_img = Image.open(input_path).convert("RGBA")
    alpha_channel = np.array(pil_img)[:, :, 3]  # Save alpha before processing

    # Work on RGB channels only via OpenCV
    img_rgb = np.array(pil_img.convert("RGB"))
    img_bgr = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2BGR)
    
    # Convert to LAB space to isolate luminance channel (preserves colors perfectly)
    lab = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)
    
    # Apply CLAHE to balance shadows and highlights dynamically
    clahe = cv2.createCLAHE(clipLimit=2.5, tileGridSize=(8, 8))
    cl = clahe.apply(l)
    
    # Merge channels and convert back
    merged = cv2.merge((cl, a, b))
    balanced = cv2.cvtColor(merged, cv2.COLOR_LAB2BGR)
    
    # Bilateral smoothing to denoise shadow areas while keeping sharp edges
    smoothed = cv2.bilateralFilter(balanced, 7, 50, 50)
    
    # Restore original alpha channel and save as PNG
    smoothed_rgb = cv2.cvtColor(smoothed, cv2.COLOR_BGR2RGB)
    result = np.dstack((smoothed_rgb, alpha_channel))
    Image.fromarray(result, 'RGBA').save(output_path)
    print("Balance lighting completed.", flush=True)

# ── 4. LINE ART ENHANCEMENT (XDoG) ──
def enhance_lines(input_path, output_path):
    # Open with PIL to preserve alpha channel (cv2.imread drops alpha)
    pil_img = Image.open(input_path).convert("RGBA")
    alpha_channel = np.array(pil_img)[:, :, 3]  # Save alpha before processing

    # Work on RGB channels only via OpenCV
    img_rgb = np.array(pil_img.convert("RGB"))
    img = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2BGR)

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
    
    # Restore original alpha channel and save as PNG
    enhanced_rgb = cv2.cvtColor(enhanced, cv2.COLOR_BGR2RGB)
    result = np.dstack((enhanced_rgb, alpha_channel))
    Image.fromarray(result, 'RGBA').save(output_path)
    print("Line enhancement completed.", flush=True)

# ── 5. LOCAL RAG RECOMMENDATION ENGINE (Rules-Augmented Retrieval - RAR) ──

_model = None

# Family-grouped names for semantic synthesis aligned with game mechanics
FAMILY_NAMES = {
    "Fire": [
        "Blaze Stag", "Cinder Wolf", "Ember Lynx", "Flame Djinn", "Ashen Drake", 
        "Lava Archon", "Magma Turtle", "Pyroclastic Beast", "Scorch Scorpion", "Volcanic Hydra",
        "Crimson Reaver", "Solar Lion", "Ignis Sprite", "Furnace Golem", "Charred Phoenix",
        "Ash Falcon", "Searing Salamander", "Ember Wasp", "Blaze Hound", "Volcanic Bull",
        "Basalt Golem", "Charred Imp", "Cinder Viper", "Coal Golem", "Combustion Weaver",
        "Corona Wyrm", "Dread Ember", "Ember Bat", "Ember Drake", "Ember Golem",
        "Ember Lizard", "Ember Maw", "Ember Serpent", "Ember Shaman", "Ember Spider",
        "Ember Stag", "Ember Turtle", "Fevered Spirit", "Fire Fiend", "Fire Gargoyle",
        "Fire Salamander", "Fire Scorpion", "Fire Snake", "Fire Sphinx", "Fire Wyvern",
        "Flame Acolyte", "Flame Bearer", "Flame Beetle", "Flame Caller", "Flame Dancer",
        "Flame Drake", "Flame Druid", "Flame Falcon", "Flame Gryphon", "Flame Imp",
        "Flame Warden", "Flame Weaver", "Flame Wraith", "Flame Wyrm", "Flarescale Basilisk",
        "Flare Sprite", "Glow Wasp", "Heat Weaver", "Hellfire Hound", "Ignis Archon",
        "Ignis Drake", "Ignis Golem", "Ignis Serpent", "Infernal Beast", "Infernal Golem",
        "Lava Basilisk", "Lava Crab", "Lava Drake", "Lava Elemental", "Lava Golem",
        "Lava Lurker", "Lava Salamander", "Lava Serpent", "Lava Spider", "Lava Wasp",
        "Magma Beast", "Magma Crab", "Magma Drake", "Magma Golem", "Magma Serpent",
        "Magma Spider", "Molten Bull", "Molten Drake", "Molten Giant", "Molten Golem",
        "Pyro Drake", "Pyro Fiend", "Pyro Golem", "Pyro Hydra", "Searing Drake",
        "Searing Falcon", "Searing Serpent", "Searing Wolf", "Smoldering Golem", "Spark Sprite"
    ],
    "Water": [
        "Aquatic Sentinel", "Coral Hermit", "Deepsea Lurker", "Glacier Behemoth", "Mist Weaver",
        "River Nymph", "Sea Serpent", "Tidal Leviathan", "Vapor Sprite", "Abyssal Maw",
        "Frost Wyrm", "Jade Crab", "Nebula Whale", "Tsunami Elemental", "Lagoon Kraken",
        "Aqua Sprite", "Rain Spirit", "Dew Fox", "Geyser Golem", "Coral Guardian",
        "Abyssal Crab", "Abyssal Siren", "Abyssal Wyrm", "Aqua Basilisk", "Aqua Golem",
        "Aqua Hydra", "Aqua Nymph", "Aqua Sentinel", "Aqua Weaver", "Bubble Sprite",
        "Coral Drake", "Coral Fish", "Coral Golem", "Coral Serpent", "Deepsea Crab",
        "Deepsea Drake", "Deepsea Golem", "Deepsea Serpent", "Dew Sprite", "Drizzle Pixie",
        "Frost Basilisk", "Frost Crab", "Frost Drake", "Frost Giant", "Frost Golem",
        "Frost Pixie", "Frost Serpent", "Frost Sprite", "Geyser Beast", "Geyser Sprite",
        "Glacier Crab", "Glacier Drake", "Glacier Golem", "Glacier Serpent", "Glacier Spirit",
        "Ice Basilisk", "Ice Crab", "Ice Drake", "Ice Giant", "Ice Golem",
        "Ice Serpent", "Ice Sprite", "Lagoon Basilisk", "Lagoon Crab", "Lagoon Drake",
        "Lagoon Golem", "Lagoon Serpent", "Lagoon Sprite", "Mist Basilisk", "Mist Crab",
        "Mist Drake", "Mist Golem", "Mist Serpent", "Mist Sprite", "Ocean Basilisk",
        "Ocean Crab", "Ocean Drake", "Ocean Golem", "Ocean Serpent", "Ocean Sprite",
        "Rain Sprite", "River Basilisk", "River Crab", "River Drake", "River Golem",
        "River Serpent", "River Sprite", "Sea Basilisk", "Sea Crab", "Sea Drake",
        "Sea Golem", "Sea Nymph", "Sea Sprite", "Tidal Basilisk", "Tidal Crab",
        "Tidal Drake", "Tidal Golem", "Tidal Serpent", "Tidal Sprite"
    ],
    "Earth": [
        "Agate Guardian", "Ancient Colossus", "Basalt Golem", "Bramble Warden", "Canyon Behemoth",
        "Monolith Guardian", "Moss Colossus", "Obsidian Golem", "Onyx Basilisk", "Tectonic Warden",
        "Earthquake Turtle", "Grave Warden", "Stone Sentinel", "Ironclad Tortoise", "Clay Sentinel",
        "Root Golem", "Amber Wasp", "Fossil Dragon", "Quicksand Worm", "Cavern Lurker",
        "Agate Beast", "Agate Drake", "Agate Golem", "Agate Serpent", "Ancient Basilisk",
        "Ancient Crab", "Ancient Drake", "Ancient Golem", "Ancient Serpent", "Basalt Basilisk",
        "Basalt Crab", "Basalt Drake", "Basalt Serpent", "Bramble Basilisk", "Bramble Crab",
        "Bramble Drake", "Bramble Golem", "Bramble Serpent", "Canyon Basilisk", "Canyon Crab",
        "Canyon Drake", "Canyon Golem", "Canyon Serpent", "Clay Basilisk", "Clay Crab",
        "Clay Drake", "Clay Golem", "Clay Serpent", "Earthquake Drake", "Earthquake Golem",
        "Fossil Basilisk", "Fossil Crab", "Fossil Golem", "Fossil Serpent", "Grave Basilisk",
        "Grave Crab", "Grave Drake", "Grave Golem", "Grave Serpent", "Ironclad Basilisk",
        "Ironclad Crab", "Ironclad Drake", "Ironclad Golem", "Ironclad Serpent", "Monolith Basilisk",
        "Monolith Crab", "Monolith Drake", "Monolith Golem", "Monolith Serpent", "Moss Basilisk",
        "Moss Crab", "Moss Drake", "Moss Golem", "Moss Serpent", "Obsidian Basilisk",
        "Obsidian Crab", "Obsidian Drake", "Obsidian Serpent", "Onyx Beast", "Onyx Crab",
        "Onyx Drake", "Onyx Golem", "Onyx Serpent", "Quicksand Basilisk", "Quicksand Crab",
        "Quicksand Drake", "Quicksand Golem", "Quicksand Serpent", "Root Basilisk", "Root Crab",
        "Root Drake", "Root Serpent", "Stone Basilisk", "Stone Crab", "Stone Drake",
        "Stone Golem", "Stone Serpent", "Tectonic Basilisk", "Tectonic Crab", "Tectonic Drake",
        "Tectonic Golem", "Tectonic Serpent"
    ],
    "Wind": [
        "Cloud Sovereign", "Gryphon Paragon", "Lightning Falcon", "Peak Sovereign", "Sky Monarch",
        "Storm Archon", "Typhoon Drake", "Vortex Elemental", "Wind Runner", "Zephyr Sprite",
        "Aether Serpent", "Astral Phoenix", "Gale Sprite", "Hurricane Roc", "Feathered Serpent",
        "Skyline Archon", "Cyclone Hound", "Tempest Owl", "Breeze Muse", "Aether Weaver",
        "Aether Basilisk", "Aether Crab", "Aether Drake", "Aether Golem", "Aether Serpent",
        "Astral Basilisk", "Astral Crab", "Astral Drake", "Astral Golem", "Astral Serpent",
        "Breeze Basilisk", "Breeze Crab", "Breeze Drake", "Breeze Golem", "Breeze Serpent",
        "Breeze Sprite", "Cloud Basilisk", "Cloud Crab", "Cloud Drake", "Cloud Golem",
        "Cloud Serpent", "Cloud Sprite", "Cyclone Basilisk", "Cyclone Crab", "Cyclone Drake",
        "Cyclone Golem", "Cyclone Serpent", "Gale Basilisk", "Gale Crab", "Gale Drake",
        "Gale Golem", "Gale Serpent", "Gale Sprite", "Gryphon Scout", "Gryphon Sentinel",
        "Gryphon Warden", "Hurricane Basilisk", "Hurricane Crab", "Hurricane Drake", "Hurricane Golem",
        "Hurricane Serpent", "Lightning Basilisk", "Lightning Crab", "Lightning Drake", "Lightning Golem",
        "Lightning Serpent", "Peak Basilisk", "Peak Crab", "Peak Drake", "Peak Golem",
        "Peak Serpent", "Sky Basilisk", "Sky Crab", "Sky Drake", "Sky Golem",
        "Sky Serpent", "Sky Sprite", "Storm Basilisk", "Storm Crab", "Storm Drake",
        "Storm Golem", "Storm Serpent", "Storm Sprite", "Tempest Basilisk", "Tempest Crab",
        "Tempest Drake", "Tempest Golem", "Tempest Serpent", "Typhoon Basilisk", "Typhoon Crab",
        "Typhoon Golem", "Typhoon Serpent", "Vortex Basilisk", "Vortex Crab", "Vortex Drake",
        "Vortex Golem", "Vortex Serpent", "Zephyr Basilisk", "Zephyr Crab", "Zephyr Drake",
        "Zephyr Golem", "Zephyr Serpent"
    ],
    "Dragon": [
        "Apex Wyrm", "Bone Wyrm", "Zenith Dragon", "Wyvern Scout", "Celestial Archon",
        "Chimeran Wraith", "Cosmic Leviathan", "Dawn Herald", "Radiant Archon", "Tomb Revenant",
        "Void Dragon", "Ethereal Wraith", "Archon of Light", "Dread Drake", "Eclipse Dragon",
        "Solar Wyrm", "Obsidian Drake", "Nebula Dragon", "Summit Wyvern", "Astral Wyrm",
        "Apex Dragon", "Apex Golem", "Apex Serpent", "Archon of Darkness", "Archon of Eternity",
        "Archon of Shadow", "Astral Dragon", "Astral Golem", "Astral Serpent", "Bone Dragon",
        "Bone Golem", "Bone Serpent", "Celestial Dragon", "Celestial Golem", "Celestial Serpent",
        "Chimeran Dragon", "Chimeran Golem", "Chimeran Serpent", "Cosmic Dragon", "Cosmic Golem",
        "Cosmic Serpent", "Dawn Dragon", "Dawn Golem", "Dawn Serpent", "Dread Dragon",
        "Dread Golem", "Dread Serpent", "Eclipse Dragon", "Eclipse Golem", "Eclipse Serpent",
        "Ethereal Dragon", "Ethereal Golem", "Ethereal Serpent", "Nebula Dragon", "Nebula Golem",
        "Nebula Serpent", "Obsidian Dragon", "Obsidian Golem", "Obsidian Serpent", "Radiant Dragon",
        "Radiant Golem", "Radiant Serpent", "Solar Dragon", "Solar Golem", "Solar Serpent",
        "Summit Dragon", "Summit Golem", "Summit Serpent", "Tomb Dragon", "Tomb Golem",
        "Tomb Serpent", "Void Dragon", "Void Golem", "Void Serpent", "Wyvern Scout",
        "Wyvern Sentinel", "Wyvern Warden", "Zenith Dragon", "Zenith Golem", "Zenith Serpent",
        "Void Wyrm", "Astral Wyrm", "Solar Wyrm", "Eclipse Wyrm", "Cosmic Wyrm",
        "Dread Wyrm", "Tomb Wyrm", "Apex Wyrm", "Celestial Wyrm", "Dawn Wyrm",
        "Radiant Wyrm", "Ethereal Wyrm", "Nebula Wyrm", "Summit Wyrm"
    ]
}

# Rich database of exactly 100 hand-crafted unique static effects per family with balanced cost pairing
FAMILY_ABILITIES = {
    "Fire": [
        ("Passive \\icon(Permanent): You can keep two more stones.", 0),
        ("Instant \\icon(Instant): Earn two \\icon(Stone1).\nActive \\icon(Active): Recover.", 0),
        ("Instant \\icon(Instant): If \\icon(Card)s with written cost of 1, 2, 3, and 4 are all in your area, earn \\icon(Score, 10).", 0),
        ("Instant \\icon(Instant): Earn \\icon(Score, 1) for each \\icon(Card) in your hand.", 1),
        ("Active \\icon(Active): Earn one \\icon(Stone1) and \\icon(Score, 1).", 1),
        ("Active \\icon(Active): Earn four \\icon(Stone1).", 2),
        ("Instant \\icon(Instant): Earn \\icon(Score, 1) for each \\icon(Card) in your area.", 2),
        ("Instant \\icon(Instant): Earn \\icon(Score, 2) for each \\icon(Card) with a written cost of 2 or less in your area.", 2),
        ("Active \\icon(Active): Discard one of your \\icon(Stone1), then earn \\icon(Score, 3).", 3),
        ("Instant \\icon(Instant): Earn \\icon(Score, 2) for each \\icon(Fire) \\icon(Card) in your area.", 3),
        ("Passive \\icon(Permanent): Whenever you summon a \\icon(Card), earn \\icon(Score, 1) for each used \\icon(Stone1).", 3),
        ("Passive \\icon(Permanent): The value of your \\icon(Stone1) stones is increased by 1.", 4),
        ("Active \\icon(Active): Recover one of your \\icon(Card)s with an Instant \\icon(Instant) effect and a written cost of 2 or less.", 4),
        ("Active \\icon(Active): Recover one of your \\icon(Fire) \\icon(Card)s with an Instant \\icon(Instant) effect.", 4),
        ("Instant \\icon(Instant): Earn \\icon(Score, 2) for each \\icon(Card) family in your area.", 4),
        ("Instant \\icon(Instant): Earn one \\icon(Stone1) for each other \\icon(Fire) \\icon(Card) in your area.", 1),
        ("Active \\icon(Active): You may discard one card from your hand to earn two \\icon(Stone1).", 1),
        ("Passive \\icon(Permanent): Your \\icon(Fire) \\icon(Card)s cost one less \\icon(Stone1) to summon.", 2),
        ("Instant \\icon(Instant): Search your discard pile for a card with cost 0 and add it to your hand.", 1),
        ("Active \\icon(Active): Earn one \\icon(Stone1) for each card in your hand.", 2),
        ("Passive \\icon(Permanent): Whenever you discard a card from your hand, earn \\icon(Score, 1).", 2),
        ("Instant \\icon(Instant): Discard one of your active cards to earn five \\icon(Stone1).", 1),
        ("Active \\icon(Active): Swap one card in your hand with a card in your discard pile.", 2),
        ("Instant \\icon(Instant): Gain one \\icon(Stone1) and summon a cost 1 card from your hand for free.", 2),
        ("Passive \\icon(Permanent): You may summon cards directly from your discard pile.", 4),
        ("Active \\icon(Active): Discard all your Red Stones, then earn \\icon(Score, 2) for each discarded stone.", 3),
        ("Instant \\icon(Instant): All other players must discard one \\icon(Stone1) from their supply.", 3),
        ("Active \\icon(Active): Pay one \\icon(Stone1) to copy the Active effect of an adjacent card in your area.", 3),
        ("Passive \\icon(Permanent): Your active Fire cards cannot be targeted by opponents' Instant effects.", 3),
        ("Instant \\icon(Instant): Place the top card of the discard pile into your hand.", 2),
        ("Active \\icon(Active): Look at the top three cards of the discard pile and add one to your hand.", 3),
        ("Passive \\icon(Permanent): Whenever a card is placed in the discard pile, earn \\icon(Score, 1).", 3),
        ("Instant \\icon(Instant): Summon a card from your discard pile. Its cost must be fully paid.", 2),
        ("Active \\icon(Active): Pay two \\icon(Stone1) to recover this card from your area to your hand.", 1),
        ("Passive \\icon(Permanent): The summoning cost of all cards is increased by one \\icon(Stone1) for opponents.", 4),
        ("Instant \\icon(Instant): Earn \\icon(Score, 2) if you have exactly three cards in your discard pile.", 1),
        ("Active \\icon(Active): You may discard this card to draw two cards.", 1),
        ("Passive \\icon(Permanent): Whenever you sell a card, you may choose to put it in your hand instead of discarding it.", 4),
        ("Instant \\icon(Instant): Swap the summoning costs of two cards in the draft zone.", 2),
        ("Active \\icon(Active): Add the bottom card of the discard pile to your hand.", 2),
        ("Passive \\icon(Permanent): Your hand size is unchecked during the end phase.", 0),
        ("Instant \\icon(Instant): Discard one card from your hand to search the discard pile for any card.", 2),
        ("Active \\icon(Active): Gain one \\icon(Stone1) for each card type in the discard pile.", 3),
        ("Passive \\icon(Permanent): Whenever you summon a card of cost 0, earn \\icon(Score, 2).", 3),
        ("Instant \\icon(Instant): Draw a card from the deck, then discard one card.", 1),
        ("Active \\icon(Active): Discard one of your summoned cards to summon a Fire card from your hand for free.", 3),
        ("Passive \\icon(Permanent): Fire cards in the draft zone cost one less stone for you to summon.", 3),
        ("Instant \\icon(Instant): Recover a card of cost 3 or more from your area to your hand.", 2),
        ("Active \\icon(Active): Earn one \\icon(Stone1) for each unique card family in the discard pile.", 3),
        ("Passive \\icon(Permanent): Whenever an opponent sells a card, earn one \\icon(Stone1).", 4),
        ("Instant \\icon(Instant): All players must return their cheapest active card to their hand.", 2),
        ("Active \\icon(Active): Pay one \\icon(Stone1) to shuffle the discard pile back into the draw deck.", 1),
        ("Passive \\icon(Permanent): Your Fire cards gain \\icon(Score, 1) during the Resolution Phase.", 3),
        ("Instant \\icon(Instant): For each Fire card in the draft zone, gain one \\icon(Stone1).", 1),
        ("Active \\icon(Active): Take a card from the draft zone and place it directly in the discard pile.", 2),
        ("Passive \\icon(Permanent): Whenever you recover a card, earn \\icon(Score, 1).", 3),
        ("Instant \\icon(Instant): Look at an opponent's hand and choose one card to discard.", 3),
        ("Active \\icon(Active): Discard a card from your hand to recover an active card of cost 2 or less.", 2),
        ("Passive \\icon(Permanent): Whenever you pay exactly one \\icon(Stone1) for a card, earn \\icon(Score, 2).", 3),
        ("Instant \\icon(Instant): Swap the top card of the draw deck with the top card of the discard pile.", 1),
        ("Active \\icon(Active): Earn one \\icon(Stone1) if you have the lowest score.", 1),
        ("Passive \\icon(Permanent): You may discard cards from your Area for 0 cost.", 4),
        ("Instant \\icon(Instant): Discard one card from your Area to earn three \\icon(Stone1).", 1),
        ("Active \\icon(Active): If your hand is empty, draw one card and earn one \\icon(Stone1).", 2),
        ("Passive \\icon(Permanent): The cost to remove cards from your Area is reduced by 2.", 3),
        ("Instant \\icon(Instant): Earn \\icon(Score, 4) if you have an active Fire card of cost 4.", 3),
        ("Active \\icon(Active): Discard a Fire card from your hand to search your deck for a Fire card.", 3),
        ("Passive \\icon(Permanent): You may use cards in your discard pile to pay for taming costs.", 4),
        ("Instant \\icon(Instant): Draw a card for each active Fire card in your Area.", 2),
        ("Active \\icon(Active): Discard one of your active cards to earn \\icon(Score, 4).", 3),
        ("Passive \\icon(Permanent): Fire cards adjacent to this card gain \\icon(Score, 1) during resolution.", 3),
        ("Instant \\icon(Instant): Return a card of cost 1 from your Area to your hand.", 1),
        ("Active \\icon(Active): Pay one \\icon(Stone1) to draw a card.", 2),
        ("Passive \\icon(Permanent): Opponents must pay one additional \\icon(Stone1) to summon Fire cards.", 4),
        ("Instant \\icon(Instant): Put a Fire card from the discard pile into the draft zone.", 1),
        ("Active \\icon(Active): Choose a card in your Area; it is treated as having cost 0 until the end of the round.", 2),
        ("Passive \\icon(Permanent): Whenever you gain victory points, gain one \\icon(Stone1).", 4),
        ("Instant \\icon(Instant): Discard a card from your Area to return a card of cost 3 from your discard pile to your hand.", 2),
        ("Active \\icon(Active): Discard one card from your hand to draw two cards.", 2),
        ("Passive \\icon(Permanent): When this card is discarded, return it to your hand.", 3),
        ("Instant \\icon(Instant): Earn \\icon(Score, 1) for each Fire card in the discard pile.", 2),
        ("Active \\icon(Active): Exchange a card in your Area with a Fire card in your hand.", 2),
        ("Passive \\icon(Permanent): Your Fire cards are immune to opponent discard effects.", 4),
        ("Instant \\icon(Instant): Discard a card to earn two \\icon(Stone1) and \\icon(Score, 2).", 2),
        ("Active \\icon(Active): Discard a Fire card to recover this card.", 2),
        ("Passive \\icon(Permanent): Whenever you draw a card, you may discard it to gain one \\icon(Stone1).", 3),
        ("Instant \\icon(Instant): Choose an opponent; they must discard a card of cost 1.", 2),
        ("Active \\icon(Active): Pay one \\icon(Stone1) to look at the top card of the draw deck.", 1),
        ("Passive \\icon(Permanent): Whenever you pay for a card, you may discard a card to reduce the cost by 2.", 4),
        ("Instant \\icon(Instant): Earn \\icon(Score, 3) if your Area is not full.", 2),
        ("Active \\icon(Active): Discard a card of cost 0 to draw a card.", 1),
        ("Passive \\icon(Permanent): Whenever you summon a card of cost 4, earn four \\icon(Stone1).", 4),
        ("Instant \\icon(Instant): Take a Fire card from your discard pile and summon it for free.", 3),
        ("Active \\icon(Active): Discard two cards from your discard pile to draw a card.", 2),
        ("Passive \\icon(Permanent): Fire cards in the discard pile count as being in your hand for summon requirements.", 4),
        ("Instant \\icon(Instant): Earn \\icon(Score, 2) for each opponent's active card of cost 0.", 2),
        ("Active \\icon(Active): Pay one \\icon(Stone1) to recover any active card of cost 1.", 2),
        ("Passive \\icon(Permanent): Selling Fire cards rewards you with four \\icon(Stone1) instead of three.", 3),
        ("Instant \\icon(Instant): Discard a card from your Area to return two cost 1 cards from your discard pile to your hand.", 2),
        ("Active \\icon(Active): Exchange one \\icon(Stone1) for \\icon(Score, 2).", 1)
    ],
    "Water": [
        ("Instant \\icon(Instant): Discard all your stones and earn points equal to the total value of discarded stones.", 0),
        ("Passive \\icon(Permanent): Whenever you summon a \\icon(Card) using a \\icon(Stone3), earn \\icon(Score, 2).", 1),
        ("Active \\icon(Active): Earn \\icon(Score, 1) for each of your \\icon(Stone3).", 1),
        ("Instant \\icon(Instant): Earn a \\icon(Stone3).\nActive \\icon(Active): Recover.", 1),
        ("Active \\icon(Active): If there is no \\icon(Dragon) \\icon(Card) in your area, earn \\icon(Score, 2).", 2),
        ("Passive \\icon(Permanent): Value of your \\icon(Stone3) counts as value of your \\icon(Stone6), value of your \\icon(Stone6) counts as value of your \\icon(Stone3).", 3),
        ("Active \\icon(Active): Exchange one of your \\icon(Stone3) with \\icon(Stone6). / Exchange one of your \\icon(Stone6) with three \\icon(Stone3).", 3),
        ("Active \\icon(Active): Earn a \\icon(Stone3).", 3),
        ("Instant \\icon(Instant): Earn points equal to the total value of your \\icon(Stone3).", 3),
        ("Instant \\icon(Instant): Choose 2 between: Gain two \\icon(Stone3) / Gain one \\icon(Stone6) Draw a \\icon(Card) / Gain \\icon(Score, 4). Earn them.", 4),
        ("Instant \\icon(Instant): Earn \\icon(Score, 7). A player of your choice discards one of their summoned \\icon(Card)s.", 4),
        ("Passive \\icon(Permanent): Whenever you tame a \\icon(Water) \\icon(Card), earn two \\icon(Stone3).", 4),
        ("Instant \\icon(Instant): Earn two \\icon(Stone3).\nPassive \\icon(Permanent): Values of your \\icon(Stone3) and \\icon(Stone6) are each increased by 1.", 4),
        ("Active \\icon(Active): Discard one of your \\icon(Stone3), then earn \\icon(Score, 5).", 5),
        ("Instant \\icon(Instant): Earn \\icon(Score, 3) for each \\icon(Water) \\icon(Card) in your area.", 7),
        ("Instant \\icon(Instant): Earn one \\icon(Stone3).", 1),
        ("Active \\icon(Active): Convert one \\icon(Stone1) into one \\icon(Stone3).", 1),
        ("Passive \\icon(Permanent): Your Water cards require one less \\icon(Stone1) to summon.", 2),
        ("Instant \\icon(Instant): Exchange three \\icon(Stone1) for one \\icon(Stone3) and draw a card.", 2),
        ("Active \\icon(Active): If you have a Water card in your Area, gain one \\icon(Stone3).", 2),
        ("Passive \\icon(Permanent): Whenever you sell a card, you may choose to receive one \\icon(Stone3) instead of Red Stones.", 3),
        ("Instant \\icon(Instant): Draw a card for each active Water card you control.", 2),
        ("Active \\icon(Active): Pay one Blue Stone to draw two cards.", 3),
        ("Instant \\icon(Instant): Earn \\icon(Score, 3) if you have exactly two \\icon(Stone3).", 2),
        ("Passive \\icon(Permanent): Your Blue Stones are worth 4 units instead of 3.", 4),
        ("Active \\icon(Active): Discard a Blue Stone to gain one Purple Stone.", 4),
        ("Instant \\icon(Instant): All players must exchange one Purple Stone for Blue Stones.", 3),
        ("Active \\icon(Active): Discard a card from your hand to gain one \\icon(Stone3).", 2),
        ("Passive \\icon(Permanent): Whenever you summon a Water card, earn \\icon(Score, 2).", 3),
        ("Instant \\icon(Instant): Search the deck for a Water card and reveal it.", 2),
        ("Active \\icon(Active): Discard one card from your Area to gain two \\icon(Stone3).", 3),
        ("Passive \\icon(Permanent): Opponents must pay one additional \\icon(Stone3) to summon Water cards.", 4),
        ("Instant \\icon(Instant): Exchange one Purple Stone for two Blue Stones from the supply.", 2),
        ("Active \\icon(Active): Pay one Blue Stone to recover this card to your hand.", 2),
        ("Passive \\icon(Permanent): Water cards in your Area cannot be targeted by opponents' Active effects.", 4),
        ("Instant \\icon(Instant): Earn \\icon(Score, 1) for each active card in your Area.", 1),
        ("Active \\icon(Active): Choose a card in the draft zone; its cost is reduced by one Blue Stone.", 2),
        ("Passive \\icon(Permanent): When this card is sold, earn two Blue Stones.", 3),
        ("Instant \\icon(Instant): Gain one Blue Stone and draw a card.", 2),
        ("Active \\icon(Active): Exchange one Blue Stone with an opponent's Blue Stone.", 1),
        ("Passive \\icon(Permanent): You may hold up to 5 Magic Stones if at least two are Blue.", 3),
        ("Instant \\icon(Instant): Reveal your hand; if it contains a Water card, gain one Blue Stone.", 2),
        ("Active \\icon(Active): Choose one card in the draft zone and freeze it; it cannot be summoned this round.", 3),
        ("Passive \\icon(Permanent): The summoning cost of all cards is decreased by one Blue Stone for you.", 4),
        ("Instant \\icon(Instant): If you have no Blue Stones, gain two Blue Stones.", 2),
        ("Active \\icon(Active): Discard one Blue Stone to gain \\icon(Score, 4) and draw a card.", 3),
        ("Passive \\icon(Permanent): Whenever a player gains a Purple Stone, earn one Blue Stone.", 5),
        ("Instant \\icon(Instant): Earn points equal to the total cost of all Water cards in your Area.", 4),
        ("Active \\icon(Active): Return a Water card from your Area to your hand to gain one Blue Stone.", 3),
        ("Passive \\icon(Permanent): Your active Water cards gain \\icon(Score, 1) during the Resolution Phase.", 3),
        ("Instant \\icon(Instant): Choose an opponent; they must give you one Blue Stone.", 3),
        ("Active \\icon(Active): Pay one Blue Stone to copy the Instant effect of a card in the draft zone.", 3),
        ("Passive \\icon(Permanent): Your Water cards cost 2 less to summon if you have a Blue Stone.", 3),
        ("Instant \\icon(Instant): Discard one card to gain one Blue Stone and one Red Stone.", 1),
        ("Active \\icon(Active): Exchange one Blue Stone for three Red Stones.", 2),
        ("Passive \\icon(Permanent): Whenever you sell a Water card, earn \\icon(Score, 2).", 3),
        ("Instant \\icon(Instant): Earn \\icon(Score, 4) if you have exactly three Water cards in play.", 3),
        ("Active \\icon(Active): Discard a Water card from your Area to recover any card from the discard pile.", 4),
        ("Passive \\icon(Permanent): Whenever an opponent summons a Water card, draw a card.", 4),
        ("Instant \\icon(Instant): All players must return one card from their hand to the deck.", 2),
        ("Active \\icon(Active): Draw two cards, then choose and discard one card.", 2),
        ("Passive \\icon(Permanent): Your Water cards are immune to automatic discard effects.", 4),
        ("Instant \\icon(Instant): Gain one Blue Stone for each card type in the draft zone.", 3),
        ("Active \\icon(Active): Discard a card to earn \\icon(Score, 2) and draw a card.", 2),
        ("Passive \\icon(Permanent): Value of your Red Stones is increased by 1 if you have a Blue Stone.", 4),
        ("Instant \\icon(Instant): Discard one active card to search the deck for a Water card.", 2),
        ("Active \\icon(Active): If your hand is empty, draw two cards.", 2),
        ("Passive \\icon(Permanent): When this card is discarded, draw a card.", 3),
        ("Instant \\icon(Instant): Choose a card in the draft zone and put it into your discard pile.", 2),
        ("Active \\icon(Active): Spend all your stones to earn double their total value in victory points.", 3),
        ("Passive \\icon(Permanent): Opponents must pay one additional Blue Stone to summon Dragon cards.", 5),
        ("Instant \\icon(Instant): Gain one Blue Stone and summon a Water card of cost 2 or less for free.", 3),
        ("Active \\icon(Active): Return a Water card from your Area to your hand to draw three cards.", 3),
        ("Passive \\icon(Permanent): Selling Water cards rewards you with one Blue Stone and one Red Stone.", 3),
        ("Instant \\icon(Instant): Swap the top card of the draw deck with the top card of the discard pile.", 1),
        ("Active \\icon(Active): Pay one Blue Stone to look at the top card of the draw deck.", 1),
        ("Passive \\icon(Permanent): Whenever you pay for a card, you may discard a card to reduce the cost by 3.", 4),
        ("Instant \\icon(Instant): Earn \\icon(Score, 3) if your Area is not full.", 2),
        ("Active \\icon(Active): Discard a card of cost 0 to draw a card.", 1),
        ("Passive \\icon(Permanent): Whenever you summon a card of cost 7, earn one Purple Stone.", 5),
        ("Instant \\icon(Instant): Take a Water card from your discard pile and summon it for free.", 3),
        ("Active \\icon(Active): Discard two cards from your discard pile to draw a card.", 2),
        ("Passive \\icon(Permanent): Water cards in the discard pile count as being in hand for summoning.", 4),
        ("Instant \\icon(Instant): Earn \\icon(Score, 2) for each opponent's active card of cost 0.", 2),
        ("Active \\icon(Active): Pay one Blue Stone to recover any active card of cost 3.", 2),
        ("Passive \\icon(Permanent): Selling Water cards rewards you with two Blue Stones instead of one.", 4),
        ("Instant \\icon(Instant): Discard a card to return a Water card of cost 3 from your discard pile to your hand.", 2),
        ("Active \\icon(Active): Exchange one Blue Stone for \\icon(Score, 3).", 2),
        ("Passive \\icon(Permanent): Whenever you gain victory points, gain one Blue Stone.", 5),
        ("Instant \\icon(Instant): Earn \\icon(Score, 4) if you have an active Water card of cost 7.", 3),
        ("Active \\icon(Active): Discard a Water card from your hand to search your deck for a Water card.", 3),
        ("Passive \\icon(Permanent): You may use cards in your discard pile to pay for taming costs.", 4),
        ("Instant \\icon(Instant): Draw a card for each active Water card in your Area.", 2),
        ("Active \\icon(Active): Discard one of your active cards to earn \\icon(Score, 4).", 3),
        ("Passive \\icon(Permanent): Water cards adjacent to this card gain \\icon(Score, 1) during resolution.", 3),
        ("Instant \\icon(Instant): Return a card of cost 1 from your Area to your hand.", 1),
        ("Active \\icon(Active): Pay one Blue Stone to draw a card.", 2),
        ("Passive \\icon(Permanent): Opponents must pay one additional Blue Stone to summon Water cards.", 4),
        ("Instant \\icon(Instant): Put a Water card from the discard pile into the draft zone.", 1),
        ("Active \\icon(Active): Choose a card in your Area; it is treated as having cost 0 until the end of the round.", 2)
    ],
    "Earth": [
        ("Instant \\icon(Instant): Discard a \\icon(Card) from your hand and summon another \\icon(Card) for free.", 0),
        ("Active \\icon(Active): Steal \\icon(Score, 1) from any opponent.", 1),
        ("Instant \\icon(Instant): Discard a \\icon(Card) from your hand and earn points equal to the cost written on the \\icon(Card).", 2),
        ("Passive \\icon(Permanent): Whenever you summon a \\icon(Card) using \\icon(Stone6), earn \\icon(Score, 3).", 2),
        ("Active \\icon(Active): Lose \\icon(Score, 0) / \\icon(Score, 1) / \\icon(Score, 2), then earn a \\icon(Stone1) / \\icon(Stone3) / \\icon(Stone6).", 3),
        ("Active \\icon(Active): If you have a \\icon(Stone6), earn \\icon(Score, 3).", 3),
        ("Active \\icon(Active): If any opponent has more points than you, earn \\icon(Score, 4). Otherwise, lose \\icon(Score, 4).", 4),
        ("Active \\icon(Active): Discard a \\icon(Card) from your hand, then earn \\icon(Stone6).", 4),
        ("Instant \\icon(Instant): Discard up to 3 of your other summoned \\icon(Card)s", 5),
        ("Active \\icon(Active): Choose any \\icon(Earth) \\icon(Card) from the discard pile. Add it into your hand.", 6),
        ("Instant \\icon(Instant): Earn \\icon(Score, 6).\nActive \\icon(Active): Recover.", 6),
        ("Instant \\icon(Instant): Earn points equal to the total value of your \\icon(Stone6).", 6),
        ("Instant \\icon(Instant): Exchange each of your stones with \\icon(Stone6).", 6),
        ("Instant \\icon(Instant): Earn \\icon(Score, 3) for each \\icon(Card) family in your area.", 9),
        ("Instant \\icon(Instant): Earn \\icon(Score, 4) for each \\icon(Earth) \\icon(Card) in your area.", 10),
        ("Instant \\icon(Instant): Gain one \\icon(Stone6).", 2),
        ("Active \\icon(Active): Lose \\icon(Score, 2) to gain one Purple Stone.", 2),
        ("Passive \\icon(Permanent): Your Earth cards require one less \\icon(Stone3) to summon.", 2),
        ("Instant \\icon(Instant): Discard two cards from hand to gain one Purple Stone.", 3),
        ("Active \\icon(Active): Discard an active card from your Area to gain one Purple Stone.", 3),
        ("Passive \\icon(Permanent): Whenever you sell a card, you may choose to gain one Purple Stone and lose 2 points.", 4),
        ("Instant \\icon(Instant): Lose \\icon(Score, 4) to draw three cards.", 2),
        ("Active \\icon(Active): Pay one Purple Stone to gain \\icon(Score, 8).", 4),
        ("Instant \\icon(Instant): Earn \\icon(Score, 5) if you have exactly one Purple Stone.", 3),
        ("Passive \\icon(Permanent): Your Purple Stones are worth 8 units instead of 6.", 5),
        ("Active \\icon(Active): Discard your entire hand to gain \\icon(Score, 2) per card discarded.", 4),
        ("Instant \\icon(Instant): All players must lose 3 points and discard one card.", 3),
        ("Active \\icon(Active): Discard a card to earn \\icon(Score, 3) and gain one Purple Stone.", 3),
        ("Passive \\icon(Permanent): Whenever you summon an Earth card, earn \\icon(Score, 3).", 4),
        ("Instant \\icon(Instant): Search the deck for an Earth card of cost 6 or higher.", 3),
        ("Active \\icon(Active): Discard one card from your Area to gain \\icon(Score, 6).", 4),
        ("Passive \\icon(Permanent): Opponents must pay one additional Purple Stone to summon Earth cards.", 5),
        ("Instant \\icon(Instant): Exchange one Purple Stone for three Blue Stones.", 2),
        ("Active \\icon(Active): Pay one Purple Stone to recover this card to your hand.", 3),
        ("Passive \\icon(Permanent): Earth cards in your Area cannot be deleted or discarded by opponent effects.", 5),
        ("Instant \\icon(Instant): Earn \\icon(Score, 4) if your active card count is exactly 4.", 3),
        ("Active \\icon(Active): Choose a card in the draft zone; its cost is reduced by one Purple Stone.", 3),
        ("Passive \\icon(Permanent): When this card is sold, earn one Purple Stone and one Blue Stone.", 4),
        ("Instant \\icon(Instant): Gain one Purple Stone and draw a card.", 3),
        ("Active \\icon(Active): Exchange one Purple Stone with an opponent's Purple Stone.", 2),
        ("Passive \\icon(Permanent): You cannot gain Red Stones. If you would, gain \\icon(Score, 2) instead.", 4),
        ("Instant \\icon(Instant): Gain \\icon(Score, 5) if you control a Fire card and an Earth card.", 3),
        ("Active \\icon(Active): Discard one card of cost 5 or higher to draw three cards.", 3),
        ("Passive \\icon(Permanent): The summoning cost of all cards is decreased by one Purple Stone for you.", 6),
        ("Instant \\icon(Instant): If you have no Purple Stones, gain two Purple Stones.", 3),
        ("Active \\icon(Active): Discard one Purple Stone to gain \\icon(Score, 10).", 5),
        ("Passive \\icon(Permanent): Whenever an opponent scores points during the Resolution Phase, lose 1 point.", 4),
        ("Instant \\icon(Instant): Earn points equal to the total cost of all Earth cards in your Area.", 5),
        ("Active \\icon(Active): Return an Earth card from your Area to your hand to gain one Purple Stone.", 4),
        ("Passive \\icon(Permanent): Your active Earth cards gain \\icon(Score, 2) during the Resolution Phase.", 4),
        ("Instant \\icon(Instant): Choose an opponent; they must give you one Purple Stone.", 4),
        ("Active \\icon(Active): Pay one Purple Stone to copy the Instant effect of a card in the discard pile.", 4),
        ("Passive \\icon(Permanent): Your Earth cards cost 3 less to summon if you have a Purple Stone.", 4),
        ("Instant \\icon(Instant): Discard one card to gain one Purple Stone.", 2),
        ("Active \\icon(Active): Exchange one Purple Stone for six Red Stones.", 3),
        ("Passive \\icon(Permanent): Whenever you sell an Earth card, earn \\icon(Score, 3).", 4),
        ("Instant \\icon(Instant): Earn \\icon(Score, 5) if you have exactly three Earth cards in play.", 4),
        ("Active \\icon(Active): Discard an Earth card from your Area to recover any card from the discard pile.", 5),
        ("Passive \\icon(Permanent): Whenever an opponent summons an Earth card, draw two cards.", 4),
        ("Instant \\icon(Instant): All players must discard their highest-cost active card.", 3),
        ("Active \\icon(Active): Draw three cards, then choose and discard two cards.", 3),
        ("Passive \\icon(Permanent): Your Earth cards are immune to opponent score reduction effects.", 5),
        ("Instant \\icon(Instant): Gain one Purple Stone for each card type in your Area.", 4),
        ("Active \\icon(Active): Discard a card to earn \\icon(Score, 3) and gain one Blue Stone.", 2),
        ("Passive \\icon(Permanent): Value of your Blue Stones is increased by 2 if you have a Purple Stone.", 5),
        ("Instant \\icon(Instant): Discard one active card to search the deck for an Earth card.", 3),
        ("Active \\icon(Active): If your Area is completely full, draw three cards.", 3),
        ("Passive \\icon(Permanent): When this card is discarded, gain one Purple Stone.", 4),
        ("Instant \\icon(Instant): Choose a card in the draft zone and delete it from the game.", 3),
        ("Active \\icon(Active): Spend all your stones to earn double their total value in victory points.", 4),
        ("Passive \\icon(Permanent): Opponents must pay one additional Purple Stone to summon Dragon cards.", 6),
        ("Instant \\icon(Instant): Gain one Purple Stone and summon an Earth card of cost 4 or less for free.", 4),
        ("Active \\icon(Active): Return an Earth card from your Area to your hand to draw three cards.", 4),
        ("Passive \\icon(Permanent): Selling Earth cards rewards you with one Purple Stone and two Red Stones.", 4),
        ("Instant \\icon(Instant): Swap the top card of the draw deck with the top card of the discard pile.", 1),
        ("Active \\icon(Active): Pay one Purple Stone to look at the top card of the draw deck.", 2),
        ("Passive \\icon(Permanent): Whenever you pay for a card, you may discard a card to reduce the cost by 4.", 5),
        ("Instant \\icon(Instant): Earn \\icon(Score, 5) if your Area is not full.", 3),
        ("Active \\icon(Active): Discard a card of cost 0 to draw a card.", 1),
        ("Passive \\icon(Permanent): Whenever you summon a card of cost 10, earn two Purple Stones.", 6),
        ("Instant \\icon(Instant): Take an Earth card from your discard pile and summon it for free.", 4),
        ("Active \\icon(Active): Discard two cards from your discard pile to draw a card.", 2),
        ("Passive \\icon(Permanent): Earth cards in the discard pile count as being in hand for summoning.", 5),
        ("Instant \\icon(Instant): Earn \\icon(Score, 3) for each opponent's active card of cost 0.", 2),
        ("Active \\icon(Active): Pay one Purple Stone to recover any active card of cost 2 or less.", 3),
        ("Passive \\icon(Permanent): Selling Earth cards rewards you with two Purple Stones instead of one.", 5),
        ("Instant \\icon(Instant): Discard a card to return an Earth card of cost 4 from your discard pile to your hand.", 3),
        ("Active \\icon(Active): Exchange one Purple Stone for \\icon(Score, 8).", 3),
        ("Passive \\icon(Permanent): Whenever you gain victory points, gain one Purple Stone.", 6),
        ("Instant \\icon(Instant): Earn \\icon(Score, 5) if you have an active Earth card of cost 10.", 4),
        ("Active \\icon(Active): Discard an Earth card from your hand to search your deck for an Earth card.", 3),
        ("Passive \\icon(Permanent): You may use cards in your discard pile to pay for taming costs.", 5),
        ("Instant \\icon(Instant): Draw a card for each active Earth card in your Area.", 2),
        ("Active \\icon(Active): Discard one of your active cards to earn \\icon(Score, 5).", 3),
        ("Passive \\icon(Permanent): Earth cards adjacent to this card gain \\icon(Score, 2) during resolution.", 4),
        ("Instant \\icon(Instant): Return a card of cost 2 from your Area to your hand.", 2),
        ("Active \\icon(Active): Pay one Purple Stone to draw a card.", 3),
        ("Passive \\icon(Permanent): Opponents must pay one additional Purple Stone to summon Earth cards.", 5),
        ("Instant \\icon(Instant): Put an Earth card from the discard pile into the draft zone.", 1),
        ("Active \\icon(Active): Choose a card in your Area; it is treated as having cost 0 until the end of the round.", 3)
    ],
    "Wind": [
        ("Instant \\icon(Instant): Draw a \\icon(Card).\nActive \\icon(Active): Recover.", 3),
        ("Active \\icon(Active): If the number of \\icon(Card)s in your hand is the same as the number of \\icon(Card)s in your area, earn \\icon(Score, 3).", 3),
        ("Instant \\icon(Instant): Draw a \\icon(Card).\nPassive \\icon(Permanent): The cost of your \\icon(Card)s is decreased by 1.", 3),
        ("Instant \\icon(Instant): Earn \\icon(Score, 6) and put this \\icon(Card) on the top of the draw deck.", 3),
        ("Instant \\icon(Instant): Earn \\icon(Score, 1) for each \\icon(Wind) in your area. Immediately recover this \\icon(Card).", 4),
        ("Instant \\icon(Instant): Activate all available Active \\icon(Active) effects of \\icon(Card)s in your area.", 4),
        ("Instant \\icon(Instant): Draw a \\icon(Card).\nPassive \\icon(Permanent): The cost of your \\icon(Wind) \\icon(Card)s is decreased by 2.", 4),
        ("Instant \\icon(Instant): Draw a \\icon(Card).\nPassive \\icon(Permanent): Whenever you summon a \\icon(Card), earn \\icon(Score, 1).", 4),
        ("Active \\icon(Active): Copy one Active \\icon(Active) effect of another \\icon(Card) in your area and activate it.", 5),
        ("Active \\icon(Active): Earn \\icon(Score, 1) for each \\icon(Card) family in your area.", 5),
        ("Active \\icon(Active): If you have less than 6 \\icon(Card)s in your hand, earn \\icon(Score, 2). Otherwise, earn \\icon(Stone6).", 6),
        ("Active \\icon(Active): Earn \\icon(Score, 1) for each \\icon(Card) with an Active \\icon(Active) effect in your area.", 7),
        ("Active \\icon(Active): Draw a \\icon(Card).", 7),
        ("Instant \\icon(Instant): Earn \\icon(Score, 2) for each \\icon(Card) in your hand.", 8),
        ("Instant \\icon(Instant): Earn \\icon(Score, 2) for each \\icon(Card) in your area.", 10),
        ("Instant \\icon(Instant): Draw two cards.", 3),
        ("Active \\icon(Active): Draw one card if you have a Wind card in your Area.", 3),
        ("Passive \\icon(Permanent): Your Wind cards require one less Red Stone to summon.", 3),
        ("Instant \\icon(Instant): Draw three cards and discard two.", 3),
        ("Active \\icon(Active): Return an active Wind card to your hand to draw two cards.", 4),
        ("Passive \\icon(Permanent): Your hand size count earns you 1 point per card at the end of the round.", 4),
        ("Instant \\icon(Instant): Look at the top three cards of the deck and put them back in any order.", 3),
        ("Active \\icon(Active): Draw a card and choose to either discard it or keep it.", 3),
        ("Instant \\icon(Instant): If you have the most cards in hand, gain \\icon(Score, 4).", 4),
        ("Passive \\icon(Permanent): Whenever you tame a Wind card, draw a card.", 4),
        ("Active \\icon(Active): Swap a card in your hand with a card in the draft zone.", 4),
        ("Instant \\icon(Instant): Draw two cards if you control a Water card.", 3),
        ("Active \\icon(Active): Discard a card from hand to draw two cards.", 3),
        ("Passive \\icon(Permanent): Whenever you summon a card of cost 3 or less, draw a card.", 4),
        ("Instant \\icon(Instant): Draw one card and gain one Blue Stone.", 4),
        ("Active \\icon(Active): Take a card from the draft zone and place it directly into your hand.", 5),
        ("Passive \\icon(Permanent): Opponents must pay one additional Red Stone to summon Wind cards.", 4),
        ("Instant \\icon(Instant): Draw a card for each unique family among active cards in play.", 4),
        ("Active \\icon(Active): Pay one Blue Stone to draw three cards.", 3),
        ("Passive \\icon(Permanent): Wind cards in your Area cannot be targeted by opponents' Instant effects.", 5),
        ("Instant \\icon(Instant): All players must draw two cards.", 3),
        ("Active \\icon(Active): Reveal your hand and choose one card to place on top of the draw deck.", 3),
        ("Passive \\icon(Permanent): When this card is sold, draw two cards.", 4),
        ("Instant \\icon(Instant): Draw two cards and choose one opponent to draw one card.", 3),
        ("Active \\icon(Active): Exchange hands with an opponent until the end of the round.", 5),
        ("Passive \\icon(Permanent): Your cards of cost 3 cost 1 less to summon.", 3),
        ("Instant \\icon(Instant): If your hand is empty, draw three cards.", 3),
        ("Active \\icon(Active): Look at an opponent's hand and choose one card to put at the bottom of the deck.", 5),
        ("Passive \\icon(Permanent): The summoning cost of all cards is decreased by one Red Stone for you.", 4),
        ("Instant \\icon(Instant): If you have exactly five cards in hand, gain \\icon(Score, 5).", 4),
        ("Active \\icon(Active): Discard one card to gain one Blue Stone and draw a card.", 3),
        ("Passive \\icon(Permanent): Whenever an opponent draws a card, gain \\icon(Score, 1).", 5),
        ("Instant \\icon(Instant): Earn points equal to the total number of cards in your hand.", 4),
        ("Active \\icon(Active): Return a Wind card from your Area to your hand to draw two cards.", 4),
        ("Passive \\icon(Permanent): Your active Wind cards gain \\icon(Score, 1) during the Resolution Phase.", 4),
        ("Instant \\icon(Instant): Choose an opponent; they must give you one card from their hand.", 5),
        ("Active \\icon(Active): Pay one Blue Stone to copy the Active effect of a card in the draft zone.", 4),
        ("Passive \\icon(Permanent): Your Wind cards cost 2 less to summon if you have a Blue Stone.", 4),
        ("Instant \\icon(Instant): Discard one card to gain one Blue Stone and one Red Stone.", 3),
        ("Active \\icon(Active): Exchange one Blue Stone for three Red Stones.", 3),
        ("Passive \\icon(Permanent): Whenever you sell a Wind card, earn \\icon(Score, 2).", 4),
        ("Instant \\icon(Instant): Earn \\icon(Score, 4) if you have exactly three Wind cards in play.", 4),
        ("Active \\icon(Active): Discard a Wind card from your Area to recover any card from the discard pile.", 5),
        ("Passive \\icon(Permanent): Whenever an opponent tames a Wind card, draw a card.", 4),
        ("Instant \\icon(Instant): All players must return one card from their hand to the deck.", 3),
        ("Active \\icon(Active): Draw two cards, then choose and discard one card.", 3),
        ("Passive \\icon(Permanent): Your Wind cards are immune to automatic discard effects.", 5),
        ("Instant \\icon(Instant): Gain one Blue Stone for each card type in the draft zone.", 4),
        ("Active \\icon(Active): Discard a card to earn \\icon(Score, 2) and draw a card.", 3),
        ("Passive \\icon(Permanent): Value of your Red Stones is increased by 1 if you have a Blue Stone.", 4),
        ("Instant \\icon(Instant): Discard one active card to search the deck for a Wind card.", 3),
        ("Active \\icon(Active): If your hand is empty, draw two cards.", 3),
        ("Passive \\icon(Permanent): When this card is discarded, draw a card.", 3),
        ("Instant \\icon(Instant): Choose a card in the draft zone and put it into your discard pile.", 3),
        ("Active \\icon(Active): Spend all your stones to earn double their total value in victory points.", 4),
        ("Passive \\icon(Permanent): Opponents must pay one additional Blue Stone to summon Dragon cards.", 6),
        ("Instant \\icon(Instant): Gain one Blue Stone and summon a Wind card of cost 3 or less for free.", 4),
        ("Active \\icon(Active): Return a Wind card from your Area to your hand to draw three cards.", 4),
        ("Passive \\icon(Permanent): Selling Wind cards rewards you with one Blue Stone and one Red Stone.", 4),
        ("Instant \\icon(Instant): Swap the top card of the draw deck with the top card of the discard pile.", 3),
        ("Active \\icon(Active): Pay one Blue Stone to look at the top card of the draw deck.", 3),
        ("Passive \\icon(Permanent): Whenever you pay for a card, you may discard a card to reduce the cost by 3.", 5),
        ("Instant \\icon(Instant): Earn \\icon(Score, 3) if your Area is not full.", 3),
        ("Active \\icon(Active): Discard a card of cost 0 to draw a card.", 3),
        ("Passive \\icon(Permanent): Whenever you summon a card of cost 8, earn one Purple Stone.", 6),
        ("Instant \\icon(Instant): Take a Wind card from your discard pile and summon it for free.", 4),
        ("Active \\icon(Active): Discard two cards from your discard pile to draw a card.", 3),
        ("Passive \\icon(Permanent): Wind cards in the discard pile count as being in hand for summoning.", 5),
        ("Instant \\icon(Instant): Earn \\icon(Score, 2) for each opponent's active card of cost 0.", 3),
        ("Active \\icon(Active): Pay one Blue Stone to recover any active card of cost 3.", 4),
        ("Passive \\icon(Permanent): Selling Wind cards rewards you with two Blue Stones instead of one.", 5),
        ("Instant \\icon(Instant): Discard a card to return a Wind card of cost 3 from your discard pile to your hand.", 3),
        ("Active \\icon(Active): Exchange one Blue Stone for \\icon(Score, 3).", 3),
        ("Passive \\icon(Permanent): Whenever you gain victory points, gain one Blue Stone.", 5),
        ("Instant \\icon(Instant): Earn \\icon(Score, 4) if you have an active Wind card of cost 8.", 4),
        ("Active \\icon(Active): Discard a Wind card from your hand to search your deck for a Wind card.", 4),
        ("Passive \\icon(Permanent): You may use cards in your discard pile to pay for taming costs.", 5),
        ("Instant \\icon(Instant): Draw a card for each active Wind card in your Area.", 3),
        ("Active \\icon(Active): Discard one of your active cards to earn \\icon(Score, 4).", 4),
        ("Passive \\icon(Permanent): Wind cards adjacent to this card gain \\icon(Score, 1) during resolution.", 4),
        ("Instant \\icon(Instant): Return a card of cost 3 from your Area to your hand.", 3),
        ("Active \\icon(Active): Pay one Blue Stone to draw a card.", 3),
        ("Passive \\icon(Permanent): Opponents must pay one additional Blue Stone to summon Wind cards.", 5),
        ("Instant \\icon(Instant): Put a Wind card from the discard pile into the draft zone.", 3),
        ("Active \\icon(Active): Choose a card in your Area; it is treated as having cost 0 until the end of the round.", 4)
    ],
    "Dragon": [
        ("Instant \\icon(Instant): Discard this \\icon(Card) and summon a \\icon(Dragon) \\icon(Card) for free.", 3),
        ("Instant \\icon(Instant): Earn \\icon(Score, 5) for each \\icon(Dragon) \\icon(Card) in your area.", 5),
        ("Instant \\icon(Instant): Earn \\icon(Score, 7). A player of your choice discards one of their summoned \\icon(Water) \\icon(Card)s.", 7),
        ("Instant \\icon(Instant): Earn \\icon(Score, 7). A player of your choice discards one of their summoned \\icon(Fire) \\icon(Card)s.", 7),
        ("Instant \\icon(Instant): Earn \\icon(Score, 8). A player of your choice discards one of their summoned \\icon(Wind) \\icon(Card)s.", 8),
        ("Instant \\icon(Instant): Earn \\icon(Score, 8). A player of your choice discards one of their summoned \\icon(Earth) \\icon(Card)s.", 8),
        ("Instant \\icon(Instant): Recover one of your other \\icon(Card)s and earn points equal to the cost written on that \\icon(Card).", 9),
        ("Instant \\icon(Instant): Copy one Instant \\icon(Instant) effect of another \\icon(Card) in your area and activate it.", 9),
        ("Instant \\icon(Instant): Earn one \\icon(Stone1), one \\icon(Stone3), and one \\icon(Stone6). Draw a \\icon(Card). Earn \\icon(Score, 3).", 10),
        ("Instant \\icon(Instant): Earn \\icon(Score, 4) for each \\icon(Card) family in your area.", 12),
        ("Instant \\icon(Instant): Delete a card from the draft zone and gain \\icon(Score, 5).", 5),
        ("Active \\icon(Active): Pay one Purple Stone to delete a card in your Area and gain \\icon(Score, 10).", 8),
        ("Passive \\icon(Permanent): This card takes 2 slots in your Area, but scores \\icon(Score, 4) at the end of each round.", 7),
        ("Instant \\icon(Instant): Delete a card from your discard pile to gain \\icon(Score, 3).", 5),
        ("Active \\icon(Active): Delete this card to gain \\icon(Score, 8) and clear space in your Area.", 7),
        ("Passive \\icon(Permanent): Your other cards gain \\icon(Score, 2) if you control less than 3 cards in your Area.", 8),
        ("Instant \\icon(Instant): Delete one of your active cards to summon a high-cost card from hand for free.", 8),
        ("Active \\icon(Active): Delete a card from the draft zone to gain \\icon(Score, 4).", 6),
        ("Passive \\icon(Permanent): While you control another active Dragon card, this card cannot be deleted.", 8),
        ("Active \\icon(Active): Sacrifice this card to add a Dragon card from your deck to your hand.", 5),
        ("Instant \\icon(Instant): Pay one Purple Stone to delete an opponent's card of cost 3 or less.", 7),
        ("Passive \\icon(Permanent): Whenever a card is deleted from the game, gain \\icon(Score, 2).", 7),
        ("Active \\icon(Active): Delete the top card of the deck to gain \\icon(Score, 3).", 6),
        ("Instant \\icon(Instant): Delete this card immediately to draw three cards and gain one Purple Stone.", 5),
        ("Passive \\icon(Permanent): This card cannot be targeted or deleted by other players' effects.", 9),
        ("Active \\icon(Active): Delete a card in your hand to gain \\icon(Score, 4).", 6),
        ("Instant \\icon(Instant): Delete two cards from your discard pile to gain one Purple Stone.", 6),
        ("Passive \\icon(Permanent): Your other Dragon cards gain \\icon(Score, 2) during the Resolution Phase.", 8),
        ("Active \\icon(Active): If your Area is completely full, delete one card to gain \\icon(Score, 6).", 7),
        ("Instant \\icon(Instant): Delete a card from the draft zone to gain one Purple Stone.", 5),
        ("Passive \\icon(Permanent): The summoning cost of all Dragon cards is reduced by 2.", 8),
        ("Instant \\icon(Instant): Delete a card from hand to draw three cards.", 6),
        ("Active \\icon(Active): Swap this card with a card of cost 10 or more in your hand.", 7),
        ("Passive \\icon(Permanent): Whenever you summon a Dragon card, gain one Purple Stone.", 9),
        ("Instant \\icon(Instant): Choose an opponent; delete a card in their hand and they draw a card.", 8),
        ("Active \\icon(Active): Delete an active card to search the deck for a Dragon card.", 7),
        ("Passive \\icon(Permanent): The maximum card capacity of your Area is increased by 1.", 10),
        ("Instant \\icon(Instant): Earn \\icon(Score, 10) if you have exactly two Dragon cards in your Area.", 8),
        ("Active \\icon(Active): Pay one Purple Stone to copy the Instant effect of any deleted card.", 8),
        ("Passive \\icon(Permanent): You may delete cards from your discard pile to pay for summoning costs.", 9),
        ("Instant \\icon(Instant): Delete a card from your Area to gain \\icon(Score, 6) and draw a card.", 7),
        ("Active \\icon(Active): Delete one card in the draft zone and replace it with a card from your hand.", 5),
        ("Passive \\icon(Permanent): Whenever you sell a Dragon card, earn \\icon(Score, 3).", 8),
        ("Instant \\icon(Instant): Delete this card to double the victory points of all your active cards this round.", 12),
        ("Active \\icon(Active): Spend all your stones to earn double their total value in victory points.", 8),
        ("Passive \\icon(Permanent): Opponents must pay one additional Purple Stone to summon Dragon cards.", 9),
        ("Instant \\icon(Instant): Gain one Purple Stone and summon a Dragon card of cost 7 or less for free.", 10),
        ("Active \\icon(Active): Return a Dragon card from your Area to your hand to draw three cards.", 7),
        ("Passive \\icon(Permanent): Selling Dragon cards rewards you with one Purple Stone and two Red Stones.", 8),
        ("Instant \\icon(Instant): Swap the top card of the draw deck with the top card of the discard pile.", 5),
        ("Active \\icon(Active): Pay one Purple Stone to look at the top card of the draw deck.", 6),
        ("Passive \\icon(Permanent): Whenever you pay for a card, you may discard a card to reduce the cost by 4.", 8),
        ("Instant \\icon(Instant): Earn \\icon(Score, 5) if your Area is not full.", 6),
        ("Active \\icon(Active): Discard a card of cost 0 to draw a card.", 3),
        ("Passive \\icon(Permanent): Whenever you summon a card of cost 12, earn two Purple Stones.", 10),
        ("Instant \\icon(Instant): Take a Dragon card from your discard pile and summon it for free.", 10),
        ("Active \\icon(Active): Discard two cards from your discard pile to draw a card.", 5),
        ("Passive \\icon(Permanent): Dragon cards in the discard pile count as being in hand for summoning.", 9),
        ("Instant \\icon(Instant): Earn \\icon(Score, 3) for each opponent's active card of cost 0.", 5),
        ("Active \\icon(Active): Pay one Purple Stone to recover any active card of cost 2 or less.", 6),
        ("Passive \\icon(Permanent): Selling Dragon cards rewards you with two Purple Stones instead of one.", 9),
        ("Instant \\icon(Instant): Discard a card to return a Dragon card of cost 5 from your discard pile to your hand.", 6),
        ("Active \\icon(Active): Exchange one Purple Stone for \\icon(Score, 8).", 7),
        ("Passive \\icon(Permanent): Whenever you gain victory points, gain one Purple Stone.", 10),
        ("Instant \\icon(Instant): Earn \\icon(Score, 5) if you have an active Dragon card of cost 12.", 8),
        ("Active \\icon(Active): Discard a Dragon card from your hand to search your deck for a Dragon card.", 6),
        ("Passive \\icon(Permanent): You may use cards in your discard pile to pay for taming costs.", 8),
        ("Instant \\icon(Instant): Draw a card for each active Dragon card in your Area.", 5),
        ("Active \\icon(Active): Discard one of your active cards to earn \\icon(Score, 5).", 6),
        ("Passive \\icon(Permanent): Dragon cards adjacent to this card gain \\icon(Score, 2) during resolution.", 8),
        ("Instant \\icon(Instant): Return a card of cost 3 from your Area to your hand.", 5),
        ("Active \\icon(Active): Pay one Purple Stone to draw a card.", 6),
        ("Passive \\icon(Permanent): Opponents must pay one additional Purple Stone to summon Dragon cards.", 8),
        ("Instant \\icon(Instant): Put a Dragon card from the discard pile into the draft zone.", 5),
        ("Active \\icon(Active): Choose a card in your Area; it is treated as having cost 0 until the end of the round.", 6),
        ("Instant \\icon(Instant): Earn \\icon(Score, 6) if you control at least one Fire card and one Water card.", 7),
        ("Active \\icon(Active): Choose an opponent; their active card count is reduced by 1 for this round.", 8),
        ("Passive \\icon(Permanent): You may summon cards directly from the draft zone.", 10),
        ("Instant \\icon(Instant): Choose two cards in the draft zone and delete them from the game.", 8),
        ("Active \\icon(Active): Recover one of your active cards to your hand.", 5),
        ("Passive \\icon(Permanent): Dragon cards adjacent to this card cost 2 less to summon.", 8),
        ("Instant \\icon(Instant): If you have exactly one card in hand, gain \\icon(Score, 6).", 6),
        ("Active \\icon(Active): Discard all your stones to gain one Purple Stone.", 5),
        ("Passive \\icon(Permanent): The summoning cost of all non-Dragon cards is increased by 1.", 9),
        ("Instant \\icon(Instant): Earn \\icon(Score, 2) for each active card in play.", 7),
        ("Active \\icon(Active): Draw a card and earn one Purple Stone.", 7),
        ("Passive \\icon(Permanent): Dragon cards in your Area cannot be targeted by opponents' Active effects.", 9),
        ("Instant \\icon(Instant): Discard your hand to delete a card in your Area and gain \\icon(Score, 10).", 8),
        ("Active \\icon(Active): If your hand is empty, draw three cards.", 6),
        ("Passive \\icon(Permanent): Selling cards rewards you with one Purple Stone instead of three Red Stones.", 8),
        ("Instant \\icon(Instant): Swap one card in your Area with a card in your hand.", 5),
        ("Active \\icon(Active): Pay one Purple Stone to look at the top three cards of the deck.", 7),
        ("Passive \\icon(Permanent): Your active Dragon cards gain \\icon(Score, 2) during the Resolution Phase.", 8),
        ("Instant \\icon(Instant): Delete one of your summoned cards to earn \\icon(Score, 8).", 8),
        ("Active \\icon(Active): Discard two cards from your Area to gain two Purple Stones.", 8),
        ("Passive \\icon(Permanent): Whenever a Dragon card is summoned, all players must discard a card from hand.", 10),
        ("Instant \\icon(Instant): Return a card of cost 5 from your Area to your hand.", 6),
        ("Active \\icon(Active): Exchange one Purple Stone for \\icon(Score, 10).", 8),
        ("Passive \\icon(Permanent): Your Dragon cards are immune to opponent score reduction effects.", 9),
        ("Instant \\icon(Instant): All players must return their highest-cost active card to their hand.", 8)
    ]
}

def get_compatible_family(concept_family, input_family):
    if concept_family == "Dragon":
        return "Dragon"
    synergy_map = {
        "Fire": ["Fire", "Earth"],
        "Water": ["Water", "Wind"],
        "Earth": ["Earth", "Fire"],
        "Wind": ["Wind", "Water"]
    }
    candidates = synergy_map.get(concept_family, [concept_family])
    if input_family in candidates:
        return input_family
    return random.choice(candidates)

def recommend_cards(card_json_str):
    import re
    import random
    
    try:
        if os.path.exists(card_json_str):
            with open(card_json_str, 'r', encoding='utf-8') as f:
                input_card = json.load(f)
        else:
            input_card = json.loads(card_json_str)
    except Exception as e:
        return {"error": f"Invalid JSON inputs: {str(e)}"}

    name = input_card.get("name", "").strip()
    cost = int(input_card.get("cost", 0))
    family = input_card.get("family", "Water").strip()
    effect = input_card.get("effect", "").strip()
    
    print("Loading local semantic RAG embedding model...", file=sys.stderr, flush=True)
    global _model
    if _model is None:
        install_and_import('sentence_transformers')
        from sentence_transformers import SentenceTransformer
        _model = SentenceTransformer('all-MiniLM-L6-v2')
    model = _model
    
    input_text = f"{name} ({family}): cost {cost}. {effect}"
    input_embedding = model.encode(input_text, convert_to_numpy=True)
    input_norm = np.linalg.norm(input_embedding)
    
    print("Synthesizing 5 unique cross-family card concepts via RAG retrieval...", file=sys.stderr, flush=True)
    
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
        
        # Load database files inside function call to get dynamic updates
        db_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'public', 'rag_database.json')
        with open(db_path, 'r', encoding='utf-8') as f:
            _rag_db = json.load(f)

        FAMILY_NAMES = _rag_db['names']
        FAMILY_ABILITIES = _rag_db['abilities']

        names_pool = FAMILY_NAMES[concept_family]
        abilities_pool = FAMILY_ABILITIES[concept_family]
        
        # Ability texts for cosine similarity
        ability_texts = [item[0] for item in abilities_pool]
        
        names_embeddings = model.encode(names_pool, convert_to_numpy=True)
        abilities_embeddings = model.encode(ability_texts, convert_to_numpy=True)
        
        name_scores = np.dot(names_embeddings, input_embedding) / (np.linalg.norm(names_embeddings, axis=1) * input_norm)
        ability_scores = np.dot(abilities_embeddings, input_embedding) / (np.linalg.norm(abilities_embeddings, axis=1) * input_norm)
        
        top_name_indices = np.argsort(name_scores)[::-1][:5].tolist()
        top_ability_indices = np.argsort(ability_scores)[::-1][:5].tolist()
        
        name_idx = random.choice(top_name_indices)
        ability_idx = random.choice(top_ability_indices)
        
        base_name = names_pool[name_idx]
        theme_word = random.choice(family_themes.get(concept_family, ["Spectral"]))
        noun = base_name.split()[-1]
        name_str = f"{theme_word} {noun}"
        
        ability_str, cost_val = abilities_pool[ability_idx]
        
        concept_card = {
            "name": name_str,
            "cost": cost_val,
            "family": concept_family,
            "effect": ability_str,
            "score": round(float(ability_scores[ability_idx] * 0.7 + name_scores[name_idx] * 0.3), 3)
        }
        final_output.append(concept_card)
        
    return final_output

def generate_random_card():
    import re
    import random
    
    # Load database files inside function call to get dynamic updates
    db_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'public', 'rag_database.json')
    with open(db_path, 'r', encoding='utf-8') as f:
        _rag_db = json.load(f)

    FAMILY_NAMES = _rag_db['names']
    FAMILY_ABILITIES = _rag_db['abilities']

    all_families = ["Fire", "Water", "Earth", "Wind", "Dragon"]
    family = random.choice(all_families)
    names_pool = FAMILY_NAMES[family]
    abilities_pool = FAMILY_ABILITIES[family]
    
    base_name = random.choice(names_pool)
    ability_str, cost_val = random.choice(abilities_pool)
    
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
    
    output_card = {
        "name": name_str,
        "cost": cost_val,
        "family": family,
        "effect": ability_str
    }
    return output_card


# ── MAIN ROUTING CLI ──

import http.server
import socketserver
import urllib.parse
import threading

class AIHandler(http.server.SimpleHTTPRequestHandler):
    def do_POST(self):
        if self.path == '/recommend':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            card_json = post_data.decode('utf-8')
            try:
                rec = recommend_cards(card_json)
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps(rec, ensure_ascii=False).encode('utf-8'))
            except Exception as e:
                self.send_response(500)
                self.end_headers()
                self.wfile.write(str(e).encode('utf-8'))
        elif self.path == '/random-card':
            try:
                card = generate_random_card()
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps(card, ensure_ascii=False).encode('utf-8'))
            except Exception as e:
                self.send_response(500)
                self.end_headers()
                self.wfile.write(str(e).encode('utf-8'))
        else:
            self.send_response(404)
            self.end_headers()

def run_server(port=8009):
    # Pre-load the model before starting the server to avoid lazy loading
    print(f"Pre-loading RAG model on port {port}...", flush=True)
    global _model
    if _model is None:
        install_and_import('sentence_transformers')
        from sentence_transformers import SentenceTransformer
        _model = SentenceTransformer('all-MiniLM-L6-v2')
    print("Model loaded. Starting server...", flush=True)
    with socketserver.TCPServer(("", port), AIHandler) as httpd:
        print(f"Serving AI sidecar API at port {port}", flush=True)
        httpd.serve_forever()


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python vale_ai.py <subcommand> [args...]", flush=True)
        sys.exit(1)

    subcommand = sys.argv[1]

    if subcommand == "api-server":
        run_server(8009)

    elif subcommand == "remove-bg":
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
        res = recommend_cards(sys.argv[2])
        print(json.dumps(res, indent=2, ensure_ascii=False), flush=True)

    elif subcommand == "random-card":
        res = generate_random_card()
        print(json.dumps(res, indent=2, ensure_ascii=False), flush=True)

    else:
        print(f"Unknown subcommand: {subcommand}", flush=True)
        sys.exit(1)
