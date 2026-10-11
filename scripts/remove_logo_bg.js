const sharp = require('sharp');
const fs = require('fs');

async function removeBackground() {
  const inputPath = 'public/logo.png';
  const outputPath = 'public/logo.png';

  const image = sharp(inputPath);
  const metadata = await image.metadata();
  const width = metadata.width;
  const height = metadata.height;

  const { data } = await image.raw().toBuffer({ resolveWithObject: true });
  // Output RGBA
  const rgba = Buffer.alloc(width * height * 4);

  // Background detection:
  // Is it low saturation gray?
  // Let's sample edges
  const isBgColor = (r, g, b) => {
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const diff = max - min;
    // Gray background in this image:
    // Saturation is low (diff < 28) and brightness is between 80 and 240
    return diff < 30 && max > 70 && min < 245;
  };

  // 2D visited array for flood fill from edges
  const visited = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  let qHead = 0;
  let qTail = 0;

  const push = (x, y) => {
    const idx = y * width + x;
    if (visited[idx]) return;
    const r = data[idx * 3];
    const g = data[idx * 3 + 1];
    const b = data[idx * 3 + 2];
    if (isBgColor(r, g, b)) {
      visited[idx] = 1;
      queue[qTail++] = idx;
    }
  };

  // Add all edge pixels
  for (let x = 0; x < width; x++) {
    push(x, 0);
    push(x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    push(0, y);
    push(width - 1, y);
  }

  // BFS
  while (qHead < qTail) {
    const curr = queue[qHead++];
    const cx = curr % width;
    const cy = Math.floor(curr / width);

    // 4-neighbors
    const neighbors = [
      [cx + 1, cy],
      [cx - 1, cy],
      [cx, cy + 1],
      [cx, cy - 1]
    ];

    for (const [nx, ny] of neighbors) {
      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        const nidx = ny * width + nx;
        if (!visited[nidx]) {
          const r = data[nidx * 3];
          const g = data[nidx * 3 + 1];
          const b = data[nidx * 3 + 2];
          if (isBgColor(r, g, b)) {
            visited[nidx] = 1;
            queue[qTail++] = nidx;
          }
        }
      }
    }
  }

  // Alpha assignment with smooth edge transition
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const r = data[idx * 3];
      const g = data[idx * 3 + 1];
      const b = data[idx * 3 + 2];

      const outIdx = idx * 4;
      rgba[outIdx] = r;
      rgba[outIdx + 1] = g;
      rgba[outIdx + 2] = b;

      if (visited[idx]) {
        rgba[outIdx + 3] = 0; // Fully transparent
      } else {
        // Check if neighbor is visited to feather the edge
        let bgNeighbors = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
              if (visited[ny * width + nx]) bgNeighbors++;
            }
          }
        }
        if (bgNeighbors > 0) {
          // Feather alpha slightly based on color difference
          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          const sat = max - min;
          if (sat < 35) {
            rgba[outIdx + 3] = Math.max(40, Math.min(255, (sat / 35) * 255));
          } else {
            rgba[outIdx + 3] = 255;
          }
        } else {
          rgba[outIdx + 3] = 255;
        }
      }
    }
  }

  // Also trim transparent bounding box if desired, or keep centered
  await sharp(rgba, {
    raw: {
      width,
      height,
      channels: 4
    }
  })
    .trim()
    .png({ quality: 100 })
    .toFile(outputPath);

  console.log('Background removed successfully and trimmed!');
}

removeBackground().catch(console.error);
