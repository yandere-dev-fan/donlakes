import { readFile, access, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { validateContent } from '../admin/schema.mjs';
const root = process.argv[2] || 'dist';
validateContent(JSON.parse(await readFile('src/content/managed.json', 'utf8')));
const html = await readFile(join(root, 'index.html'), 'utf8');
const assets = new Set([...html.matchAll(/(?:src|href)="(\/(?:images|videos|_astro)\/[^"?#]+)"/g)].map(match => decodeURI(match[1])));
const galleries = await readFile('src/content/galleries.ts', 'utf8');
for (const match of galleries.matchAll(/"([^"\n]+\/[^"\n]+)"/g)) {
  if (!match[1].includes(' ')) assets.add(`/${match[1].endsWith('.mp4') ? 'videos/' + match[1] : 'images/' + match[1] + '.webp'}`);
}
for (const asset of assets) await access(join(root, asset));
if (/Фото скоро появятся|Lorem ipsum|TODO|placehold\.co|picsum\.photos/i.test(html)) throw new Error('В публичной странице найден плейсхолдер');
if (/id="place-empty"/.test(html)) throw new Error('Пустой блок фотографии карты');
const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]));
for (const match of html.matchAll(/href="#([^"]+)"/g)) if (!ids.has(match[1])) throw new Error(`Неработающий якорь: ${match[1]}`);
async function findSecrets(dir) {
  for (const item of await readdir(dir, { withFileTypes:true })) {
    if (['INFRA.md', '.env', 'id_ed25519', 'server.mjs', 'draft.json'].includes(item.name)) throw new Error(`Приватный файл в публичной сборке: ${item.name}`);
    if (item.isDirectory()) await findSecrets(join(dir, item.name));
  }
}
await findSecrets(root);
console.log(`Site check passed: content valid, ${assets.size} media/assets exist, anchors valid, no placeholders or private files.`);
