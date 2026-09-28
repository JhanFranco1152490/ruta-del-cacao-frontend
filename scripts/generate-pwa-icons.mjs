import { mkdir } from 'node:fs/promises';
import path from 'node:path';

import sharp from 'sharp';

// Mismo trazo que src/components/brand/cacao-mark.tsx, con colores fijos: un ícono de
// manifest no puede depender de `currentColor` ni de variables CSS.
const SELVA = '#14362a';
const COBRE = '#9a5220';
const BACKGROUND = '#f7f2ea';

function icon(size, { padded = false } = {}) {
  // El tamaño "maskable" deja un margen de seguridad amplio por lado, como pide la
  // especificación de Web App Manifest para que el sistema operativo lo pueda recortar.
  const scale = padded ? 0.6 : 0.85;
  const markWidth = 48;
  const markHeight = 64;
  const drawWidth = size * scale;
  const drawHeight = (markHeight / markWidth) * drawWidth;
  const offsetX = (size - drawWidth) / 2;
  const offsetY = (size - drawHeight) / 2;

  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="${SELVA}" />
  <g transform="translate(${offsetX} ${offsetY}) scale(${drawWidth / markWidth})">
    <path d="M24 3c11 8 18 20 18 34 0 14-7 24-18 24S6 51 6 37C6 23 13 11 24 3Z" fill="${COBRE}" />
    <path d="M24 8v48M13 19c7 4 15 4 22 0M10 33c9 5 19 5 28 0M12 47c8 4 16 4 24 0" fill="none" stroke="${BACKGROUND}" stroke-width="2" stroke-linecap="round" opacity=".75" />
    <path d="M24 4c-1-2 0-4 2-4" fill="none" stroke="${COBRE}" stroke-width="3" stroke-linecap="round" />
  </g>
</svg>`;
}

const outDir = path.join(import.meta.dirname, '..', 'public', 'icons');
await mkdir(outDir, { recursive: true });

const targets = [
  { file: 'icon-192.png', size: 192, padded: false },
  { file: 'icon-512.png', size: 512, padded: false },
  { file: 'icon-512-maskable.png', size: 512, padded: true },
];

for (const { file, size, padded } of targets) {
  await sharp(Buffer.from(icon(size, { padded })))
    .png()
    .toFile(path.join(outDir, file));
  console.log(`generado ${file}`);
}
