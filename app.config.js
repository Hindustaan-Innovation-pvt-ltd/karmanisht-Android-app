/* global __dirname */
const fs = require('fs');
const path = require('path');

function getEnvVersion() {
  try {
    const envPath = path.resolve(__dirname, '.env');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const match = envContent.match(/^APP_VERSIONING\s*=\s*([^\r\n]+)/m);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
  } catch (err) {
    console.warn('Failed to parse .env file in app.config.js:', err);
  }
  return process.env.APP_VERSIONING || null;
}

module.exports = ({ config }) => {
  const envVersion = getEnvVersion();
  return {
    ...config,
    version: envVersion || config.version || "1.0.0",
  };
};
