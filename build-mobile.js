const fs = require('node:fs');
const path = require('node:path');

console.log('Preparing web assets for iOS build...');

const wwwDir = path.join(__dirname, 'www');
const publicDir = path.join(__dirname, 'ios', 'App', 'App', 'public');

fs.mkdirSync(wwwDir, { recursive: true });
fs.mkdirSync(publicDir, { recursive: true });

const files = ['index.html', 'styles.css', 'app.js'];

for (const file of files) {
  const src = path.join(__dirname, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, path.join(wwwDir, file));
    fs.copyFileSync(src, path.join(publicDir, file));
    console.log(`Copied ${file} -> www and ios public`);
  } else {
    console.warn(`Warning: ${file} not found at root`);
  }
}

console.log('Mobile assets successfully synced!');
