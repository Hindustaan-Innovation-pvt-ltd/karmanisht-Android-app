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

// Helper to translate a batch of texts using unauthenticated Google Translate API
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
    
    // Safely align lines count
    const results = [];
    for (let i = 0; i < texts.length; i++) {
      results.push(translatedLines[i] || texts[i]);
    }
    return results;
  } catch (err) {
    console.warn('[translateBatch] Translation failed, using fallback:', err);
    return texts; // Fallback to English
  }
}

async function run() {
  console.log('--- InsForge Large Scale Database Translation Syncer ---');
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

  // 1. Fetch current keys in database translations table
  console.log('Fetching existing translation keys from database...');
  let currentTranslations = [];
  try {
    const res = await fetch(`${url}/api/database/records/translations?select=key,en,hi`, { headers });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    currentTranslations = await res.json();
  } catch (err) {
    console.error('Error fetching current translations:', err);
    process.exit(1);
  }

  const dbMap = new Map();
  currentTranslations.forEach(row => {
    dbMap.set(row.key, row);
  });
  console.log(`Loaded ${dbMap.size} existing translation keys from database.`);

  // 2. Read database content dump from local JSON
  const dumpPath = path.join(__dirname, '../scratch/db-dump.json');
  if (!fs.existsSync(dumpPath)) {
    console.error(`Error: Local database dump not found at ${dumpPath}. Please run the scraper first.`);
    process.exit(1);
  }

  const dumpData = JSON.parse(fs.readFileSync(dumpPath, 'utf8'));
  console.log(`Loaded ${dumpData.length} entries from database dump.`);

  // Gather unique database item names that need translations
  const itemsToTranslate = new Set();
  dumpData.forEach(row => {
    if (row.name && row.name.trim()) {
      itemsToTranslate.add(row.name.trim());
    }
  });

  console.log(`Found ${itemsToTranslate.size} unique database content items.`);

  // Filter out items that already have a premium translation in translations table
  const queue = [];
  for (const item of itemsToTranslate) {
    const dbRow = dbMap.get(item);
    // If it doesn't exist, OR if both translations are literally equal to the key itself,
    // we want to retrieve a premium translation!
    if (!dbRow || (dbRow.en === item && dbRow.hi === item)) {
      queue.push(item);
    }
  }

  console.log(`Queueing ${queue.length} items that require premium Hindi translations...`);

  if (queue.length === 0) {
    console.log('All database items are already translated and up-to-date!');
    return;
  }

  // Process queue in batches of 40 items to avoid rate limits
  const batchSize = 40;
  const translationsToUpload = [];

  for (let i = 0; i < queue.length; i += batchSize) {
    const batch = queue.slice(i, i + batchSize);
    console.log(`Translating batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(queue.length / batchSize)} (${batch.length} items)...`);
    
    const translatedBatch = await translateBatch(batch);
    
    batch.forEach((eng, index) => {
      const hin = translatedBatch[index];
      translationsToUpload.push({
        key: eng,
        en: eng,
        hi: hin
      });
    });

    // Add a small 100ms cooldown delay between requests
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log(`Uploading ${translationsToUpload.length} database translations to InsForge...`);

  // Upload translations in batches of 100
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

  console.log(`Successfully translated and synchronized ${translationsToUpload.length} database items to InsForge!`);
}

run().catch(err => {
  console.error('Unhandled script error:', err);
  process.exit(1);
});
