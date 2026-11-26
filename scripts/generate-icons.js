const fs = require('fs');
const path = require('path');

function encodePNG(width, height, pixels) {
  const { deflateSync } = require('zlib');

  function crc32(buf) {
    let crc = 0xFFFFFFFF;
    const table = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      table[i] = c;
    }
    for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }

  function chunk(type, data) {
    const typeBytes = Buffer.from(type, 'ascii');
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const crcBuf = Buffer.concat([typeBytes, data]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(crcBuf));
    return Buffer.concat([len, typeBytes, data, crc]);
  }

  const raw = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    raw[y * (1 + width * 4)] = 0;
    for (let x = 0; x < width; x++) {
      const src = (y * width + x) * 4;
      const dst = y * (1 + width * 4) + 1 + x * 4;
      raw[dst] = pixels[src];
      raw[dst + 1] = pixels[src + 1];
      raw[dst + 2] = pixels[src + 2];
      raw[dst + 3] = pixels[src + 3];
    }
  }

  const compressed = deflateSync(raw, { level: 9 });
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', compressed), chunk('IEND', Buffer.alloc(0))]);
}

function hexToRgb(hex) {
  return [parseInt(hex.slice(1,3),16), parseInt(hex.slice(3,5),16), parseInt(hex.slice(5,7),16)];
}

function generateIcon(size) {
  const pixels = new Uint8Array(size * size * 4);
  const [bgR, bgG, bgB] = hexToRgb('#0d1117');

  // Fill background
  for (let i = 0; i < size * size; i++) {
    pixels[i*4] = bgR; pixels[i*4+1] = bgG; pixels[i*4+2] = bgB; pixels[i*4+3] = 255;
  }

  function setPixelAA(x, y, r, g, b, a) {
    if (x < 0 || x >= size || y < 0 || y >= size) return;
    const i = (y * size + x) * 4;
    const fa = a / 255;
    pixels[i]   = Math.round(pixels[i]   * (1 - fa) + r * fa);
    pixels[i+1] = Math.round(pixels[i+1] * (1 - fa) + g * fa);
    pixels[i+2] = Math.round(pixels[i+2] * (1 - fa) + b * fa);
    pixels[i+3] = 255;
  }

  function fillCircleAA(cx, cy, radius, r, g, b) {
    const r2 = radius * radius;
    for (let py = Math.floor(cy - radius - 1); py <= cy + radius + 1; py++) {
      for (let px = Math.floor(cx - radius - 1); px <= cx + radius + 1; px++) {
        const dx = px - cx, dy = py - cy;
        const dist2 = dx*dx + dy*dy;
        if (dist2 <= r2) {
          setPixelAA(px, py, r, g, b, 255);
        } else {
          const dist = Math.sqrt(dist2);
          const alpha = Math.max(0, 1 - (dist - radius)) * 255;
          if (alpha > 0) setPixelAA(px, py, r, g, b, alpha);
        }
      }
    }
  }

  function fillRect(x, y, w, h, r, g, b) {
    for (let py = y; py < y + h; py++)
      for (let px = x; px < x + w; px++)
        setPixelAA(px, py, r, g, b, 255);
  }

  // Rounded rectangle background card
  function fillRoundRect(x, y, w, h, rad, r, g, b) {
    for (let py = y; py < y + h; py++) {
      for (let px = x; px < x + w; px++) {
        // Check corners
        let inCorner = false;
        let cx2 = -1, cy2 = -1;
        if (px < x + rad && py < y + rad) { cx2 = x + rad; cy2 = y + rad; inCorner = true; }
        else if (px >= x + w - rad && py < y + rad) { cx2 = x + w - rad; cy2 = y + rad; inCorner = true; }
        else if (px < x + rad && py >= y + h - rad) { cx2 = x + rad; cy2 = y + h - rad; inCorner = true; }
        else if (px >= x + w - rad && py >= y + h - rad) { cx2 = x + w - rad; cy2 = y + h - rad; inCorner = true; }
        if (inCorner) {
          const dx = px - cx2, dy = py - cy2;
          const dist = Math.sqrt(dx*dx + dy*dy);
          if (dist <= rad) setPixelAA(px, py, r, g, b, 255);
          else if (dist <= rad + 1) setPixelAA(px, py, r, g, b, Math.round((1-(dist-rad))*255));
        } else {
          setPixelAA(px, py, r, g, b, 255);
        }
      }
    }
  }

  const [cardR, cardG, cardB] = hexToRgb('#1a2332');
  const [spadeR, spadeG, spadeB] = [255, 255, 255];

  // Draw rounded card background
  const pad = Math.round(size * 0.08);
  fillRoundRect(pad, pad, size - pad*2, size - pad*2, Math.round(size*0.12), cardR, cardG, cardB);

  const cx = size / 2;

  // ---- Spade shape ----
  // Position: centered, occupying ~60% of card height
  const spadeTopY = size * 0.18;
  const spadeBottomY = size * 0.82;
  const spadeH = spadeBottomY - spadeTopY;

  // The spade is built from:
  // 1) Two side lobes (circles) in the lower-middle area
  // 2) A top pointed triangle
  // 3) A stem + base flare at bottom

  const lobeR = spadeH * 0.265;
  const lobeCY = spadeTopY + spadeH * 0.46;
  const lobeSep = lobeR * 0.82;

  fillCircleAA(cx - lobeSep, lobeCY, lobeR, spadeR, spadeG, spadeB);
  fillCircleAA(cx + lobeSep, lobeCY, lobeR, spadeR, spadeG, spadeB);

  // Top triangle / peak — drawn as a filled triangle
  const peakX = Math.round(cx);
  const peakY = Math.round(spadeTopY);
  const triBaseY = Math.round(lobeCY + lobeR * 0.3);
  const triHalfW = Math.round(lobeR * 1.72);
  for (let py = peakY; py <= triBaseY; py++) {
    const progress = (py - peakY) / (triBaseY - peakY);
    const hw = Math.round(triHalfW * progress);
    for (let px = peakX - hw; px <= peakX + hw; px++)
      setPixelAA(px, py, spadeR, spadeG, spadeB, 255);
  }

  // Fill the gap between the two lobes (bottom-center triangle)
  const gapFillTop = Math.round(lobeCY - lobeR * 0.1);
  const gapFillBot = Math.round(lobeCY + lobeR * 0.95);
  for (let py = gapFillTop; py <= gapFillBot; py++) {
    const progress = (py - gapFillTop) / (gapFillBot - gapFillTop);
    const hw = Math.round(lobeR * 0.95 * (1 - progress * 0.5));
    for (let px = Math.round(cx - hw); px <= Math.round(cx + hw); px++)
      setPixelAA(px, py, spadeR, spadeG, spadeB, 255);
  }

  // Stem
  const stemW = Math.round(size * 0.075);
  const stemTopY = Math.round(lobeCY + lobeR * 0.55);
  const stemBotY = Math.round(spadeBottomY - size * 0.1);
  fillRect(Math.round(cx - stemW/2), stemTopY, stemW, stemBotY - stemTopY, spadeR, spadeG, spadeB);

  // Flare base
  const flareW = Math.round(size * 0.32);
  const flareH = Math.round(size * 0.052);
  const flareRad = Math.round(flareH * 0.4);
  fillRoundRect(Math.round(cx - flareW/2), stemBotY, flareW, flareH, flareRad, spadeR, spadeG, spadeB);

  return encodePNG(size, size, pixels);
}

const assetsDir = path.join(__dirname, '..', 'assets');
if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir);

console.log('Generating icon.png (1024x1024)...');
fs.writeFileSync(path.join(assetsDir, 'icon.png'), generateIcon(1024));

console.log('Generating adaptive-icon.png (1024x1024)...');
fs.writeFileSync(path.join(assetsDir, 'adaptive-icon.png'), generateIcon(1024));

console.log('Generating splash.png (1024x1024)...');
fs.writeFileSync(path.join(assetsDir, 'splash.png'), generateIcon(1024));

console.log('Done! Assets written to assets/');
