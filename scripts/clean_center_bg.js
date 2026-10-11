const sharp = require('sharp');

async function cleanCenter() {
  const image = sharp('public/logo.png');
  const metadata = await image.metadata();
  const width = metadata.width;
  const height = metadata.height;

  const { data } = await image.raw().toBuffer({ resolveWithObject: true });
  const rgba = Buffer.alloc(width * height * 4);

  // First pass: copy and mark gray background pixels
  const isBg = new Uint8Array(width * height);

  for (let i = 0; i < width * height; i++) {
    const a = data[i * 4 + 3];
    if (a === 0) {
      isBg[i] = 1;
      continue;
    }

    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const diff = max - min;

    // Gray background in pocket
    if (diff < 18 && max < 245) {
      isBg[i] = 1;
    }
  }

  // Second pass: apply alpha with edge feathering for smooth anti-aliased cutout
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const outIdx = idx * 4;

      const r = data[outIdx];
      const g = data[outIdx + 1];
      const b = data[outIdx + 2];

      rgba[outIdx] = r;
      rgba[outIdx + 1] = g;
      rgba[outIdx + 2] = b;

      if (isBg[idx]) {
        rgba[outIdx + 3] = 0;
      } else {
        // Check if any neighbor is background to feather the transition
        let bgNeighbors = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
              if (isBg[ny * width + nx]) bgNeighbors++;
            }
          }
        }

        if (bgNeighbors > 0) {
          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          const diff = max - min;
          if (diff < 35) {
            // Smoothly taper alpha at the boundary
            rgba[outIdx + 3] = Math.max(50, Math.min(255, Math.round((diff / 35) * 255)));
          } else {
            rgba[outIdx + 3] = 255;
          }
        } else {
          rgba[outIdx + 3] = data[outIdx + 3];
        }
      }
    }
  }

  await sharp(rgba, {
    raw: {
      width,
      height,
      channels: 4,
    },
  })
    .png({ quality: 100 })
    .toFile('public/logo.png');

  console.log('Center pocket background cleaned successfully!');
}

cleanCenter().catch(console.error);
