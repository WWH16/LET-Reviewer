// Writes the app icons: a black square with a white outlined square. No image library needed.
// Run: node scripts/make-icons.mjs
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const sum = Buffer.alloc(4);
  sum.writeUInt32BE(crc(body));
  return Buffer.concat([len, body, sum]);
};

function png(size) {
  const inset = Math.round(size * 0.28);
  const stroke = Math.max(2, Math.round(size * 0.045));
  const raw = Buffer.alloc((size + 1) * size); // one filter byte per row, then grayscale pixels
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const inside = x >= inset && x < size - inset && y >= inset && y < size - inset;
      const hollow =
        x >= inset + stroke && x < size - inset - stroke && y >= inset + stroke && y < size - inset - stroke;
      raw[y * (size + 1) + 1 + x] = inside && !hollow ? 0xfa : 0x0a;
    }
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // bit depth 8, color type 0 (grayscale)
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

for (const size of [180, 192, 512]) writeFileSync(`public/icon-${size}.png`, png(size));
