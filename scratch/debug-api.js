const fs = require('fs');
const path = require('path');

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
  const env = loadEnv();
  const url = env.EXPO_PUBLIC_INSFORGE_URL;
  const anonKey = env.EXPO_PUBLIC_INSFORGE_ANON_KEY;
  const headers = {
    'apikey': anonKey,
    'Authorization': `Bearer ${anonKey}`
  };

  const res = await fetch(`${url}/api/database/records/service_categories?select=name`, { headers });
  const data = await res.json();
  console.log("Response Status:", res.status);
  console.log("Response Type:", typeof data);
  console.log("Is Array?", Array.isArray(data));
  console.log("Response Length:", data.length);
  console.log("Sample Data:", JSON.stringify(data).substring(0, 500));
}
run();
