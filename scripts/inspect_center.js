const sharp = require('sharp');

async function inspectCenter() {
  const image = sharp('public/logo.png');
  const metadata = await image.metadata();
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
  console.log('Size:', info.width, info.height);

  // Sample around the center:
  const cx = Math.floor(info.width * 0.35); // based on the screenshot, the pocket is around x: 30-40%, y: 40-55%
  const cy = Math.floor(info.height * 0.45);

  for (let dy = -50; dy <= 50; dy += 25) {
    for (let dx = -50; dx <= 50; dx += 25) {
      const x = cx + dx;
      const y = cy + dy;
      const idx = (y * info.width + x) * info.channels;
      console.log(`(${x}, ${y}): R=${data[idx]}, G=${data[idx+1]}, B=${data[idx+2]}, A=${data[idx+3]}`);
    }
  }
}

inspectCenter();
