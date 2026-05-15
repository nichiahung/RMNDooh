import { deflateSync } from 'zlib';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

// CRC32 implementation (required by PNG spec)
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c;
}
function crc32(buf: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBytes = Buffer.from(type, 'ascii');
  const crcInput = Buffer.concat([typeBytes, data]);
  const crcBytes = Buffer.alloc(4);
  crcBytes.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([len, typeBytes, data, crcBytes]);
}

function makePNG(width: number, height: number, r: number, g: number, b: number): Buffer {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 2; // color type RGB (no alpha)

  const rowSize = 1 + width * 3;
  const raw = Buffer.alloc(height * rowSize);
  for (let y = 0; y < height; y++) {
    raw[y * rowSize] = 0;
    for (let x = 0; x < width; x++) {
      raw[y * rowSize + 1 + x * 3] = r;
      raw[y * rowSize + 1 + x * 3 + 1] = g;
      raw[y * rowSize + 1 + x * 3 + 2] = b;
    }
  }

  return Buffer.concat([
    signature,
    pngChunk('IHDR', ihdrData),
    pngChunk('IDAT', deflateSync(raw)),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

const outDir = join(process.cwd(), 'public', 'test-assets');
mkdirSync(outDir, { recursive: true });

const assets: Array<{ file: string; w: number; h: number; r: number; g: number; b: number; label: string }> = [
  { file: 'test-landscape.png', w: 32,  h: 18,  r: 59,  g: 130, b: 246, label: 'landscape_16_9 (32×18)' },
  { file: 'test-portrait.png',  w: 18,  h: 32,  r: 34,  g: 197, b: 94,  label: 'portrait_9_16 (18×32)'  },
  { file: 'test-square.png',    w: 24,  h: 24,  r: 249, g: 115, b: 22,  label: 'square_1_1 (24×24)'     },
  { file: 'test-ultrawide.png', w: 48,  h: 16,  r: 168, g: 85,  b: 247, label: 'ultra_wide (48×16)'     },
];

for (const { file, w, h, r, g, b, label } of assets) {
  const png = makePNG(w, h, r, g, b);
  const outPath = join(outDir, file);
  writeFileSync(outPath, png);
  console.log(`✓ ${label} → public/test-assets/${file} (${png.length} bytes)`);
}

console.log('\nTest assets generated. Use them to test the upload zones in the campaign planner.');
