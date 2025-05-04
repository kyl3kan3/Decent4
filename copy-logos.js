import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create public directory if it doesn't exist
const publicDir = path.join(__dirname, 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir);
  console.log('Created public directory');
}

// Source logos in attached_assets
const logoFiles = [
  {
    source: path.join(__dirname, 'attached_assets', 'F06A1D98-5E45-4383-932B-E0F261F5A5C8.png'),
    destination: path.join(publicDir, 'd4-logo.png')
  },
  {
    source: path.join(__dirname, 'attached_assets', 'E5E99A78-C11E-4C70-AA7E-B94AA517EC20.png'),
    destination: path.join(publicDir, 'd4-logo-gradient.png')
  }
];

// Copy each logo file to the public directory
logoFiles.forEach(file => {
  try {
    fs.copyFileSync(file.source, file.destination);
    console.log(`Copied ${path.basename(file.source)} to ${file.destination}`);
  } catch (err) {
    console.error(`Error copying ${file.source}: ${err.message}`);
  }
});

console.log('Logo files are now available in the public directory');
console.log('Access them at:');
console.log('- /public/d4-logo.png');
console.log('- /public/d4-logo-gradient.png');