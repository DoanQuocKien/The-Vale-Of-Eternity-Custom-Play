/**
 * Python Sidecar Execution Runner for Neutralinojs
 * Handles temporary files, base64 conversions, and running Python backend processes.
 */

// Helper to determine the executable path
async function getPythonCommand() {
  if (typeof window === 'undefined' || !window.Neutralino) {
    throw new Error('Neutralinojs not initialized');
  }
  
  try {
    // Check if packaged sidecar exists in bin/
    await window.Neutralino.filesystem.getStats(`${window.NL_PATH}/bin/vale_ai.exe`);
    return `"${window.NL_PATH}/bin/vale_ai.exe"`;
  } catch (e) {
    // Fall back to python script in dev mode
    return `python "electron/vale_ai.py"`;
  }
}

// Convert base64 dataUrl to an ArrayBuffer
function dataUrlToArrayBuffer(dataUrl) {
  const base64Data = dataUrl.split(',')[1];
  const binaryString = window.atob(base64Data);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

// Convert an ArrayBuffer to a PNG dataUrl
function arrayBufferToDataUrl(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer);
  let binary = '';
  const len = bytes.byteLength;
  // Use chunked conversion to avoid stack overflow with huge files
  const chunkSize = 65536;
  for (let i = 0; i < len; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, chunk);
  }
  const base64 = window.btoa(binary);
  return `data:image/png;base64,${base64}`;
}

/**
 * Run a Python sidecar processing subcommand on a dataUrl image.
 * 
 * @param {string} subcommand - Subcommand (e.g. 'remove-bg', 'upscale', 'balance-lighting', 'enhance-lines')
 * @param {string} inputDataUrl - Data URL of the input image
 * @param {function} [onProgress] - Callback for progress reporting
 * @returns {Promise<string>} Data URL of the processed image
 */
export async function runPythonImageProcess(subcommand, inputDataUrl, onProgress) {
  if (typeof window === 'undefined' || !window.Neutralino) {
    console.warn(`[PythonRunner] Not running on desktop wrapper, returning original image for ${subcommand}`);
    return inputDataUrl;
  }

  const timestamp = Date.now();
  const tempInPath = `./temp_${subcommand}_in_${timestamp}.png`;
  const tempOutPath = `./temp_${subcommand}_out_${timestamp}.png`;

  try {
    onProgress?.(10);
    // 1. Write input dataURL to temp file
    const inBuffer = dataUrlToArrayBuffer(inputDataUrl);
    await window.Neutralino.filesystem.writeBinaryFile(tempInPath, inBuffer);
    
    onProgress?.(30);
    // 2. Prepare Python / compiled executable call
    const runCmd = await getPythonCommand();
    const cmd = `${runCmd} ${subcommand} "${tempInPath}" "${tempOutPath}"`;
    
    console.log(`[PythonRunner] Executing: ${cmd}`);
    
    // We can monitor stderr to capture downloading percentages
    onProgress?.(50);
    
    const result = await window.Neutralino.os.execCommand(cmd);
    
    if (result.exitCode !== 0) {
      throw new Error(`Python sidecar exited with code ${result.exitCode}: ${result.stdErr || result.stdOut}`);
    }

    onProgress?.(85);
    // 3. Read output temp file
    const outBuffer = await window.Neutralino.filesystem.readBinaryFile(tempOutPath);
    const outputDataUrl = arrayBufferToDataUrl(outBuffer);
    
    onProgress?.(100);
    return outputDataUrl;

  } catch (err) {
    console.error(`[PythonRunner] ${subcommand} failed:`, err);
    throw err;
  } finally {
    // Clean up temp files silently
    try {
      await window.Neutralino.filesystem.removeFile(tempInPath);
    } catch (e) {}
    try {
      await window.Neutralino.filesystem.removeFile(tempOutPath);
    } catch (e) {}
  }
}

let cachedRagDb = null;

const FAMILY_THEMES = {
  Fire: ["Blaze", "Cinder", "Ember", "Flame", "Lava", "Magma", "Pyro", "Volcanic", "Ash", "Scorch"],
  Water: ["Aquatic", "Coral", "Deepsea", "Glacier", "Mist", "River", "Sea", "Tidal", "Vapor", "Abyssal"],
  Earth: ["Agate", "Ancient", "Basalt", "Bramble", "Canyon", "Earthquake", "Emerald", "Monolith", "Moss", "Obsidian", "Onyx", "Tectonic"],
  Wind: ["Aether", "Astral", "Cloud", "Lightning", "Storm", "Typhoon", "Vortex", "Wind", "Zephyr", "Sky", "Gryphon"],
  Dragon: ["Apex", "Archon", "Bone", "Dragon", "Drake", "Hydra", "Peak", "Wyrm", "Wyvern", "Zenith"]
};

async function getRagDatabase() {
  if (cachedRagDb) return cachedRagDb;
  try {
    const res = await fetch('/rag_database.json');
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    cachedRagDb = await res.json();
    return cachedRagDb;
  } catch (err) {
    console.error('Failed to load rag_database.json:', err);
    return null;
  }
}

export async function runPythonRecommendation(cardData) {
  const db = await getRagDatabase();
  if (!db) return [];

  const name = cardData.name || "";
  const cost = parseInt(cardData.cost) || 0;
  const family = cardData.family || "Water";
  const effect = cardData.effect || "";

  // Target input text components to look for keyword overlap
  const inputText = `${name} ${effect}`.toLowerCase();
  
  const allFamilies = ["Fire", "Water", "Earth", "Wind", "Dragon"];
  // Keep input family first, then others
  const otherFamilies = allFamilies.filter(f => f !== family);
  // Shuffle other families
  for (let i = otherFamilies.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [otherFamilies[i], otherFamilies[j]] = [otherFamilies[j], otherFamilies[i]];
  }
  const conceptFamilies = [family, ...otherFamilies];

  const finalOutput = [];

  // Helper helper to token-match two texts
  const getKeywords = (text) => {
    if (!text) return [];
    return text.toLowerCase()
      .replace(/[^\w\s\u26a1\u23f3\u221e\\(\u00e0-\u00ff]/gi, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2 && !['the', 'and', 'for', 'you', 'your', 'with', 'from', 'this', 'that', 'card', 'cards', 'whenever', 'gain', 'have'].includes(w));
  };

  const inputKeywords = getKeywords(inputText);

  const calculateSimilarity = (candidateText) => {
    const candKeywords = getKeywords(candidateText);
    if (inputKeywords.length === 0 || candKeywords.length === 0) return 0.1; // small baseline
    const s1 = new Set(inputKeywords);
    let intersect = 0;
    for (const kw of candKeywords) {
      if (s1.has(kw)) intersect++;
    }
    return intersect / (s1.size + candKeywords.length - intersect);
  };

  for (let idx = 0; idx < 5; idx++) {
    const conceptFamily = conceptFamilies[idx];
    const namesPool = db.names[conceptFamily];
    const abilitiesPool = db.abilities[conceptFamily];

    // Score all names in pool against input text
    const namesWithScores = namesPool.map(n => ({
      name: n,
      score: calculateSimilarity(n)
    }));
    namesWithScores.sort((a, b) => b.score - a.score);
    const topNames = namesWithScores.slice(0, 5);
    const chosenNameObj = topNames[Math.floor(Math.random() * topNames.length)];
    const baseName = chosenNameObj.name;

    // Score all abilities in pool
    const abilitiesWithScores = abilitiesPool.map(ab => {
      const [abText, abCost] = ab;
      let score = calculateSimilarity(abText);
      if (abCost === cost) score += 0.1;
      return {
        text: abText,
        cost: abCost,
        score: score
      };
    });
    abilitiesWithScores.sort((a, b) => b.score - a.score);
    const topAbilities = abilitiesWithScores.slice(0, 5);
    const chosenAbObj = topAbilities[Math.floor(Math.random() * topAbilities.length)];

    // Construct thematic name
    const themes = FAMILY_THEMES[conceptFamily];
    const themeWord = themes[Math.floor(Math.random() * themes.length)];
    const noun = baseName.split(' ').pop();
    const nameStr = `${themeWord} ${noun}`;

    finalOutput.push({
      name: nameStr,
      cost: chosenAbObj.cost,
      family: conceptFamily,
      effect: chosenAbObj.text,
      score: Math.round((chosenAbObj.score * 0.7 + chosenNameObj.score * 0.3) * 1000) / 1000
    });
  }

  return finalOutput;
}

export async function runPythonRandomCard() {
  const db = await getRagDatabase();
  if (!db) {
    return {
      name: "Ember Whelp",
      cost: 3,
      family: "Fire",
      effect: "⚡ Gain \\icon(Score, 2)."
    };
  }

  const families = ["Fire", "Water", "Earth", "Wind", "Dragon"];
  const family = families[Math.floor(Math.random() * families.length)];
  const namesPool = db.names[family];
  const abilitiesPool = db.abilities[family];

  const baseName = namesPool[Math.floor(Math.random() * namesPool.length)];
  const [abilityStr, costVal] = abilitiesPool[Math.floor(Math.random() * abilitiesPool.length)];

  const themes = FAMILY_THEMES[family];
  const themeWord = themes[Math.floor(Math.random() * themes.length)];
  const noun = baseName.split(' ').pop();
  const nameStr = `${themeWord} ${noun}`;

  return {
    name: nameStr,
    cost: costVal,
    family: family,
    effect: abilityStr
  };
}

export async function startAIServer() {
  // Deprecated: Persistent Python background server is completely removed in favor of pure JS client-side loading.
}
