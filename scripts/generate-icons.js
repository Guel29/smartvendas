import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

// Function to generate a simple uncompressed/deflated raw PNG image with brand colors
function createBrandPng(width, height, isMaskable = false) {
  // A raw RGBA buffer
  const buffer = Buffer.alloc(width * height * 4);
  const cx = width / 2;
  const cy = height / 2;
  const rOuter = width * 0.45;
  const rInner = width * 0.38;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Background color: #0f172a (15, 23, 42)
      let r = 15;
      let g = 23;
      let b = 42;
      let a = 255;

      if (!isMaskable && dist > rOuter) {
        // Outside rounded circle for standard icons
        // Subtle corner curvature
        const cornerDist = Math.max(Math.abs(dx), Math.abs(dy));
        if (cornerDist > width * 0.48) {
          a = 0;
        }
      }

      // Emerald accent badge in the center: #10b981 (16, 185, 129)
      if (dist < rInner && dist > rInner * 0.7) {
        // Outer decorative ring
        r = 16;
        g = 185;
        b = 129;
      } else if (dist <= rInner * 0.7) {
        // Center content area
        // Bar charts pattern
        const barAreaX = (x - cx) / width;
        const barAreaY = (y - cy) / height;

        // Upward sales bars in center
        if (barAreaY > -0.15 && barAreaY < 0.2) {
          if (barAreaX > -0.25 && barAreaX < -0.15 && barAreaY > 0.05) {
            r = 71; g = 85; b = 105; // Slate-600
          } else if (barAreaX > -0.12 && barAreaX < -0.02 && barAreaY > -0.02) {
            r = 16; g = 185; b = 129; // Emerald-500
          } else if (barAreaX > 0.01 && barAreaX < 0.11 && barAreaY > -0.1) {
            r = 52; g = 211; b = 153; // Emerald-400
          } else if (barAreaX > 0.14 && barAreaX < 0.24 && barAreaY > -0.18) {
            r = 16; g = 185; b = 129; // Emerald-500
          }
        }

        // Cart horizontal accent line
        if (barAreaY >= 0.18 && barAreaY <= 0.22 && barAreaX >= -0.22 && barAreaX <= 0.22) {
          r = 248; g = 250; b = 252; // White
        }
      }

      buffer[idx] = r;
      buffer[idx + 1] = g;
      buffer[idx + 2] = b;
      buffer[idx + 3] = a;
    }
  }

  // Construct PNG file format (PNG signature + IHDR + IDAT + IEND)
  const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8); // 8-bit bit depth
  ihdr.writeUInt8(6, 9); // RGBA color type
  ihdr.writeUInt8(0, 10); // Compression
  ihdr.writeUInt8(0, 11); // Filter
  ihdr.writeUInt8(0, 12); // Interlace

  const ihdrChunk = createChunk('IHDR', ihdr);

  // Scanlines with filter byte 0
  const scanlines = Buffer.alloc(height * (width * 4 + 1));
  for (let y = 0; y < height; y++) {
    const rowOffset = y * (width * 4 + 1);
    scanlines[rowOffset] = 0; // Filter None
    buffer.copy(scanlines, rowOffset + 1, y * width * 4, (y + 1) * width * 4);
  }

  const compressedData = zlib.deflateSync(scanlines);
  const idatChunk = createChunk('IDAT', compressedData);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([pngSignature, ihdrChunk, idatChunk, iendChunk]);
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = (c >>> 8) ^ table[(c ^ buf[i]) & 0xff];
  }
  return (c ^ 0xffffffff) >>> 0;
}

const table = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  table[n] = c >>> 0;
}

function createChunk(type, data) {
  const len = data.length;
  const chunk = Buffer.alloc(8 + len + 4);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);
  const crcData = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = crc32(crcData);
  chunk.writeUInt32BE(crc, 8 + len);
  return chunk;
}

const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), createBrandPng(192, 192, false));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), createBrandPng(512, 512, false));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), createBrandPng(512, 512, true));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), createBrandPng(180, 180, false));

console.log('PWA PNG Icons generated successfully in public/');
