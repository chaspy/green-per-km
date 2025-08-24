import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const JSON_PATH = path.resolve(__dirname, '../public/data/routes/chuo-rapid.km.json');

async function main() {
  const data = JSON.parse(await fs.readFile(JSON_PATH, 'utf-8'));
  const stations = data.stations;
  
  if (!stations || stations.length === 0) {
    throw new Error('No stations found in JSON');
  }
  
  const start = stations[0].km;
  const end = stations[stations.length - 1].km;
  const total = Math.round((end - start) * 10) / 10;
  
  if (total !== 53.1) {
    throw new Error(`Total km expected 53.1 but got ${total}`);
  }
  
  console.log(`✓ Central rapid total = ${total}km (expected: 53.1km)`);
  console.log(`  From: ${stations[0].name} (${start}km)`);
  console.log(`  To: ${stations[stations.length - 1].name} (${end}km)`);
  console.log(`  Stations: ${stations.length} stations`);
}

main().catch(e => { 
  console.error(e); 
  process.exit(1); 
});