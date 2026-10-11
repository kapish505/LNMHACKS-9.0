const sharp = require('sharp');

async function testThreshold() {
  const image = sharp('public/logo.png');
  const metadata = await image.metadata();
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });

  let grayCount = 0;
  let nonGrayCount = 0;

  for (let i = 0; i < info.width * info.height; i++) {
    const a = data[i * 4 + 3];
    if (a === 0) continue; // already transparent

    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const diff = max - min;

    // Is it gray background?
    if (diff < 18 && max < 245) {
      grayCount++;
    } else {
      nonGrayCount++;
    }
  }

  console.log('Remaining gray pixels in pocket:', grayCount);
  console.log('Logo foreground pixels:', nonGrayCount);
}

testThreshold();
