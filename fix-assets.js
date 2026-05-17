const Jimp = require('jimp');
const fs = require('fs');

async function convert(path) {
  try {
    const image = await Jimp.read(path);
    await image.writeAsync(path);
    console.log(`Converted ${path} to true PNG`);
  } catch (e) {
    console.error(`Failed to convert ${path}: ${e.message}`);
  }
}

const assets = [
  'assets/icon.png',
  'assets/splash-icon.png',
  'assets/android-icon-foreground.png'
];

(async () => {
  for (const asset of assets) {
    await convert(asset);
  }
})();
