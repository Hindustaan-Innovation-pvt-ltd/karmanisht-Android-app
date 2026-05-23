const fs = require('fs');
const path = require('path');

// Helper to load .env file
function loadEnv() {
  const envPath = path.join(__dirname, '../.env');
  const env = {};
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    content.split(/\r?\n/).forEach(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const k = trimmed.substring(0, idx).trim();
        const v = trimmed.substring(idx + 1).trim().replace(/^['"]|['"]$/g, '');
        env[k] = v;
      }
    });
  }
  return env;
}

// Helper to translate a batch of texts using Google Translate API
async function translateBatch(texts) {
  if (texts.length === 0) return [];
  const text = texts.join("\n");
  const q = encodeURIComponent(text);
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=hi&dt=t&q=${q}`;
  
  try {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Google Translate returned HTTP ${res.status}`);
    }
    const data = await res.json();
    const translatedSegments = data[0].map(s => s[0]).join("");
    const translatedLines = translatedSegments.split("\n").map(t => t.trim());
    
    const results = [];
    for (let i = 0; i < texts.length; i++) {
      results.push(translatedLines[i] || texts[i]);
    }
    return results;
  } catch (err) {
    console.warn('[translateBatch] Translation failed, using fallback:', err);
    return texts;
  }
}

async function run() {
  console.log('--- InsForge Key Translation Syncer ---');
  const env = loadEnv();
  const url = env.EXPO_PUBLIC_INSFORGE_URL || process.env.EXPO_PUBLIC_INSFORGE_URL;
  const anonKey = env.EXPO_PUBLIC_INSFORGE_ANON_KEY || process.env.EXPO_PUBLIC_INSFORGE_ANON_KEY;

  if (!url || !anonKey) {
    console.error('Error: InsForge connection parameters not found in .env or environment.');
    process.exit(1);
  }

  const headers = {
    'apikey': anonKey,
    'Authorization': `Bearer ${anonKey}`
  };

  // 1. Fetch current translations from database
  console.log('Fetching all translation keys from database...');
  let currentTranslations = [];
  try {
    const res = await fetch(`${url}/api/database/records/translations?select=key,en,hi`, { headers });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    currentTranslations = await res.json();
  } catch (err) {
    console.error('Error fetching translations:', err);
    process.exit(1);
  }

  console.log(`Loaded ${currentTranslations.length} translation keys from database.`);

  // 2. Identify missing/untranslated keys
  // Criteria for "untranslated": 
  // - hi is empty or null
  // - hi === key or hi === en, and doesn't contain Devanagari characters (unless it's purely numeric/symbolic)
  const devanagariRegex = /[\u0900-\u097F]/;
  const alphabeticRegex = /[a-zA-Z]/;
  const queue = [];

  currentTranslations.forEach(row => {
    const { key, en, hi } = row;
    const englishValue = en || key;
    const hindiValue = hi || '';

    const needsTranslation = 
      !hindiValue || 
      (!devanagariRegex.test(hindiValue) && alphabeticRegex.test(englishValue));

    if (needsTranslation) {
      queue.push({ key, en: englishValue });
    }
  });

  console.log(`Identified ${queue.length} keys requiring Hindi translation.`);

  if (queue.length === 0) {
    console.log('All keys are already fully translated in Hindi!');
    return;
  }

  // 3. Translate in batches of 40 to prevent API rate limits
  const batchSize = 40;
  const translationsToUpload = [];

  for (let i = 0; i < queue.length; i += batchSize) {
    const batch = queue.slice(i, i + batchSize);
    const engTexts = batch.map(x => x.en);
    console.log(`Translating batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(queue.length / batchSize)} (${batch.length} items)...`);
    
    const translatedBatch = await translateBatch(engTexts);
    
    batch.forEach((item, index) => {
      const translated = translatedBatch[index];
      translationsToUpload.push({
        key: item.key,
        en: item.en,
        hi: translated
      });
      console.log(`  [${item.key}] "${item.en}" -> "${translated}"`);
    });

    await new Promise(resolve => setTimeout(resolve, 150));
  }

  // 4. Upload translated keys in batches of 100
  console.log(`Uploading ${translationsToUpload.length} translations to InsForge...`);
  const uploadBatchSize = 100;
  for (let i = 0; i < translationsToUpload.length; i += uploadBatchSize) {
    const batch = translationsToUpload.slice(i, i + uploadBatchSize);
    try {
      const res = await fetch(`${url}/api/database/records/translations`, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates'
        },
        body: JSON.stringify(batch)
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status}: ${text}`);
      }
    } catch (uploadErr) {
      console.error(`Error uploading translations batch at index ${i}:`, uploadErr);
      process.exit(1);
    }
  }

  console.log(`Successfully translated and synchronized ${translationsToUpload.length} keys to InsForge database!`);
}

run().catch(err => {
  console.error('Unhandled script error:', err);
  process.exit(1);
});
