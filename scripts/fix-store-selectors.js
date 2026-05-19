/**
 * Finds all files still using the full bulk useAppStore() destructure pattern
 * and replaces it with a list of selective selector calls.
 * This is safe because @ts-nocheck is present on all target files.
 */
const fs = require('fs');
const path = require('path');

// The giant bulk destructure line that we want to clean up
const BULK_PATTERN = /const\s*\{[^}]{80,}\}\s*=\s*useAppStore\(\)/g;

function extractKeys(destructure) {
    const inner = destructure.match(/const\s*\{([^}]+)\}\s*=\s*useAppStore\(\)/)[1];
    return inner.split(',').map(k => k.trim()).filter(Boolean);
}

function buildSelectors(keys) {
    return keys.map(k => `    const ${k} = useAppStore(state => state.${k});`).join('\n');
}

function walk(dir) {
    let results = [];
    for (const file of fs.readdirSync(dir)) {
        const full = path.join(dir, file);
        if (fs.statSync(full).isDirectory()) results = results.concat(walk(full));
        else if (full.endsWith('.tsx') || full.endsWith('.ts')) results.push(full);
    }
    return results;
}

const files = walk(path.join(__dirname, '../src/app'));
let changed = 0;

for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');
    const match = content.match(/const\s*\{[^}]{80,}\}\s*=\s*useAppStore\(\);?/);
    if (!match) continue;

    const keys = extractKeys(match[0]);
    const selectors = buildSelectors(keys);
    const updated = content.replace(/const\s*\{[^}]{80,}\}\s*=\s*useAppStore\(\);?(\s*\n){0,2}/, selectors + '\n\n');
    fs.writeFileSync(file, updated);
    console.log(`Fixed: ${path.relative(path.join(__dirname, '..'), file)}`);
    changed++;
}

console.log(`\n✓ Fixed ${changed} file(s)`);
