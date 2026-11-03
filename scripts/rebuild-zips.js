import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import AdmZip from 'adm-zip';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const downloadsDir = path.resolve(projectRoot, 'public', 'downloads');

console.log('Inspection of existing zip files in public/downloads:');

const zipFiles = fs.readdirSync(downloadsDir).filter(f => f.endsWith('.zip'));

for (const zf of zipFiles) {
  const fullPath = path.join(downloadsDir, zf);
  try {
    const zip = new AdmZip(fullPath);
    const entries = zip.getEntries().map(e => e.entryName);
    console.log(`\nZIP: ${zf} (${entries.length} entries):`);
    console.log(entries.slice(0, 15).join('\n'));
  } catch (err) {
    console.error(`Error reading ${zf}:`, err);
  }
}
