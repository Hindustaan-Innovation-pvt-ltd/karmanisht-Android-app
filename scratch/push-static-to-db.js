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

// Parse key-values from a translation block string
function parseBlock(blockText) {
  const map = new Map();
  // Match key: "value", key: 'value', or "key": "value"
  // Handles escaped quotes and newlines
  const regex = /(?:["']?([a-zA-Z0-9_\-\s]+)["']?)\s*:\s*(["'])([\s\S]*?)(?<!\\)\2/g;
  let match;
  while ((match = regex.exec(blockText)) !== null) {
    const key = match[1].trim();
    let val = match[3];
    // Unescape quotes if any
    val = val.replace(/\\"/g, '"').replace(/\\'/g, "'");
    map.set(key, val);
  }
  return map;
}

async function run() {
  console.log('--- InsForge Static Translations Extractor & Pusher ---');
  const env = loadEnv();
  const url = env.EXPO_PUBLIC_INSFORGE_URL || process.env.EXPO_PUBLIC_INSFORGE_URL;
  const anonKey = env.EXPO_PUBLIC_INSFORGE_ANON_KEY || process.env.EXPO_PUBLIC_INSFORGE_ANON_KEY;

  if (!url || !anonKey) {
    console.error('Error: InsForge connection parameters not found in .env.');
    process.exit(1);
  }

  const i18nPath = path.join(__dirname, '../src/lib/i18n.ts');
  if (!fs.existsSync(i18nPath)) {
    console.error(`Error: i18n.ts not found at ${i18nPath}`);
    process.exit(1);
  }

  const i18nContent = fs.readFileSync(i18nPath, 'utf8');

  // Extract English and Hindi translation blocks
  const enStart = i18nContent.indexOf('en: {');
  const hiStart = i18nContent.indexOf('hi: {');

  if (enStart === -1 || hiStart === -1) {
    console.error('Error: Could not locate en or hi blocks in i18n.ts');
    process.exit(1);
  }

  // Find translation: { ... } inside en and hi blocks
  const enTransStart = i18nContent.indexOf('translation: {', enStart);
  let enTransEnd = i18nContent.indexOf('hi: {'); // Approximate boundary for English block
  if (enTransEnd === -1) enTransEnd = i18nContent.length;

  const enBlock = i18nContent.substring(enTransStart, enTransEnd);

  const hiTransStart = i18nContent.indexOf('translation: {', hiStart);
  const hiBlock = i18nContent.substring(hiTransStart);

  const enMap = parseBlock(enBlock);
  const hiMap = parseBlock(hiBlock);

  console.log(`Parsed ${enMap.size} English static translation keys.`);
  console.log(`Parsed ${hiMap.size} Hindi static translation keys.`);

  // Combine them
  const records = [];
  for (const [key, enVal] of enMap.entries()) {
    // Ignore meta/technical keys if any
    if (key === 'translation' || key === 'en' || key === 'hi') continue;
    const hiVal = hiMap.get(key) || enVal;
    records.push({
      key,
      en: enVal,
      hi: hiVal
    });
  }

  console.log(`Total unique translation records compiled: ${records.length}`);

  if (records.length === 0) {
    console.log('No translation keys extracted.');
    return;
  }

  // Upload translations to InsForge in batches of 100
  console.log('Uploading static translations to InsForge database...');
  const headers = {
    'apikey': anonKey,
    'Authorization': `Bearer ${anonKey}`,
    'Content-Type': 'application/json',
    'Prefer': 'resolution=merge-duplicates'
  };

  const uploadBatchSize = 100;
  let successCount = 0;

  for (let i = 0; i < records.length; i += uploadBatchSize) {
    const batch = records.slice(i, i + uploadBatchSize);
    try {
      const res = await fetch(`${url}/api/database/records/translations`, {
        method: 'POST',
        headers,
        body: JSON.stringify(batch)
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status}: ${text}`);
      }
      successCount += batch.length;
      console.log(`Uploaded batch ${Math.floor(i / uploadBatchSize) + 1} (${batch.length} keys)...`);
    } catch (uploadErr) {
      console.error(`Error uploading translations batch at index ${i}:`, uploadErr);
      process.exit(1);
    }
  }

  console.log(`Successfully parsed, synced, and secured ${successCount} translation records in the InsForge database!`);
}

run().catch(err => {
  console.error('Unhandled script error:', err);
  process.exit(1);
});
