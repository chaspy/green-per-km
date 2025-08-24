import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';
import fetch from 'node-fetch';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = 'https://www.jreast.co.jp/railway/train/green/charge/';
const OUT = path.resolve(__dirname, '../public/data/green-fare.table.json');

async function main() {
  const html = await (await fetch(SRC)).text();
  const dom = new JSDOM(html);
  const doc = dom.window.document;

  const rows = [...doc.querySelectorAll('table tr')];
  const bands = [];
  
  for (const tr of rows) {
    const tds = [...tr.querySelectorAll('td')].map(td => td.textContent.trim());
    if (tds.length >= 3) {
      if (/50.?km/.test(tds[0])) {
        bands.push({ 
          maxKm: 50,  
          suica: parseInt(tds[1].replace(/\D/g,''), 10), 
          ticket: parseInt(tds[2].replace(/\D/g,''), 10) 
        });
      }
      if (/100.?km/.test(tds[0])) {
        bands.push({ 
          maxKm: 100, 
          suica: parseInt(tds[1].replace(/\D/g,''), 10), 
          ticket: parseInt(tds[2].replace(/\D/g,''), 10) 
        });
      }
      if (/101/.test(tds[0])) {
        bands.push({ 
          maxKm: null, 
          suica: parseInt(tds[1].replace(/\D/g,''), 10), 
          ticket: parseInt(tds[2].replace(/\D/g,''), 10) 
        });
      }
    }
  }

  if (bands.length !== 3) {
    throw new Error(`Failed to parse fare bands. Found ${bands.length} bands instead of 3`);
  }

  const json = { 
    source: SRC, 
    updatedAt: new Date().toISOString(), 
    fareBands: bands 
  };
  
  await fs.mkdir(path.dirname(OUT), { recursive: true });
  await fs.writeFile(OUT, JSON.stringify(json, null, 2));
  console.log('Wrote', OUT);
  console.log(JSON.stringify(json, null, 2));
}

main().catch(e => { 
  console.error(e); 
  process.exit(1); 
});