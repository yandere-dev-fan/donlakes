import sharp from 'sharp';
import { readdir, mkdir, copyFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const source = fileURLToPath(new URL('../photos/', import.meta.url));
const output = fileURLToPath(new URL('../public/images/', import.meta.url));
const videoOutput = fileURLToPath(new URL('../public/videos/', import.meta.url));
async function prepare(relative = '') {
  for (const entry of await readdir(path.join(source, relative), { withFileTypes: true })) {
    const name = path.join(relative, entry.name);
    if (entry.isDirectory()) { await prepare(name); continue; }
    if (/\.(jpe?g|png)$/i.test(entry.name)) {
      const target = path.join(output, name.replace(/&/g, '-').replace(/\.(jpe?g|png)$/i, '.webp'));
      await mkdir(path.dirname(target), { recursive: true });
      await sharp(path.join(source, name)).rotate().webp({ quality: 85 }).toFile(target);
    } else if (/\.mp4$/i.test(entry.name) && ['summer_houses', 'besedki'].includes(relative)) {
      const target = path.join(videoOutput, name);
      await mkdir(path.dirname(target), { recursive: true });
      await copyFile(path.join(source, name), target);
    }
  }
}
await prepare();
