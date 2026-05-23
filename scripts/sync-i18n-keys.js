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

async function run() {
  console.log('--- Translation Key Sync Script ---');
  const env = loadEnv();
  const url = env.EXPO_PUBLIC_INSFORGE_URL || process.env.EXPO_PUBLIC_INSFORGE_URL;
  const anonKey = env.EXPO_PUBLIC_INSFORGE_ANON_KEY || process.env.EXPO_PUBLIC_INSFORGE_ANON_KEY;

  if (!url || !anonKey) {
    console.error('Error: InsForge connection parameters not found in .env or environment.');
    process.exit(1);
  }

  const srcDir = path.join(__dirname, '../src');
  if (!fs.existsSync(srcDir)) {
    console.error(`Error: Source directory does not exist: ${srcDir}`);
    process.exit(1);
  }

  const keysMap = new Map();
  // Regex to match t('key') or t('key', 'default value')
  const regex = /\bt\(\s*(['"`])(.*?)\1\s*(?:,\s*(['"`])(.*?)\3)?/g;

  function walkDir(dir) {
    const list = fs.readdirSync(dir);
    list.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
        walkDir(filePath);
      } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
        const content = fs.readFileSync(filePath, 'utf8');
        let match;
        // Reset regex index
        regex.lastIndex = 0;
        while ((match = regex.exec(content)) !== null) {
          const key = match[2]?.trim();
          const fallback = match[4]?.trim();
          if (key && key.length > 0 && !key.includes('${') && !key.includes('`')) {
            const currentFallback = keysMap.get(key);
            if (!currentFallback || fallback) {
              keysMap.set(key, fallback || key);
            }
          }
        }
      }
    });
  }

  console.log('Scanning codebase for translation keys...');
  walkDir(srcDir);
  console.log(`Found ${keysMap.size} unique keys in source files.`);

  if (keysMap.size === 0) {
    console.log('No keys to synchronize.');
    return;
  }

  console.log('Connecting to InsForge database via REST API...');
  
  // 1. Fetch current keys in database
  let dbData = [];
  try {
    const res = await fetch(`${url}/api/database/records/translations?select=key`, {
      headers: {
        'apikey': anonKey,
        'Authorization': `Bearer ${anonKey}`
      }
    });
    
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`HTTP ${res.status}: ${text}`);
    }
    
    dbData = await res.json();
  } catch (fetchError) {
    console.error('Error fetching translations from database:', fetchError);
    process.exit(1);
  }

  const dbKeys = new Set(dbData.map(row => row.key));
  const newKeysToInsert = [];

  for (const [key, fallbackValue] of keysMap.entries()) {
    if (!dbKeys.has(key)) {
      newKeysToInsert.push({
        key,
        en: fallbackValue,
        hi: fallbackValue
      });
    }
  }

  console.log(`Missing keys in database: ${newKeysToInsert.length}`);

  if (newKeysToInsert.length > 0) {
    console.log('Uploading new translation keys...');
    // Slice uploads in batches of 100
    const batchSize = 100;
    for (let i = 0; i < newKeysToInsert.length; i += batchSize) {
      const batch = newKeysToInsert.slice(i, i + batchSize);
      
      try {
        const res = await fetch(`${url}/api/database/records/translations`, {
          method: 'POST',
          headers: {
            'apikey': anonKey,
            'Authorization': `Bearer ${anonKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'resolution=merge-duplicates'
          },
          body: JSON.stringify(batch)
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(`HTTP ${res.status}: ${text}`);
        }
      } catch (insertError) {
        console.error('Error inserting translations batch:', insertError);
        process.exit(1);
      }
    }
    console.log(`Successfully synchronized ${newKeysToInsert.length} keys to database!`);
  } else {
    console.log('Database translation dictionary is already up-to-date!');
  }
}

run().catch(err => {
  console.error('Unhandled script error:', err);
  process.exit(1);
});
