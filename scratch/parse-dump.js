const fs = require('fs');
const path = require('path');

function run() {
  const sourcePath = 'C:\\Users\\user\\.gemini\\antigravity-ide\\brain\\9a34f474-378d-464c-b625-37108d2f66e3\\.system_generated\\steps\\1338\\output.txt';
  const targetPath = path.join(__dirname, 'db-dump.json');
  
  if (!fs.existsSync(sourcePath)) {
    console.error("Source file not found at:", sourcePath);
    process.exit(1);
  }
  
  const content = fs.readFileSync(sourcePath, 'utf8');
  // Find where the JSON starts
  const jsonStartIdx = content.indexOf('{');
  if (jsonStartIdx === -1) {
    console.error("No JSON found in source file.");
    process.exit(1);
  }
  
  const jsonStr = content.substring(jsonStartIdx);
  try {
    const parsed = JSON.parse(jsonStr);
    const rows = parsed.rows || [];
    fs.writeFileSync(targetPath, JSON.stringify(rows, null, 2), 'utf8');
    console.log(`Successfully parsed and saved ${rows.length} rows to: ${targetPath}`);
  } catch (err) {
    console.error("Failed parsing JSON:", err);
  }
}
run();
