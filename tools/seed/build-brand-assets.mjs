/**
 * Renders the native launch-screen assets from the same geometry the in-app
 * `BrandMark` component uses.
 *
 *   node build-brand-assets.mjs
 *
 * Why a generator rather than checked-in art: the native splash and the React
 * splash have to agree pixel for pixel, or the handover between them is a
 * visible jump. Deriving both from one source is the only way that survives
 * someone later nudging the mark.
 *
 * The app ICON is not generated here — it is the original artwork, and these
 * numbers were measured FROM it.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import sharp from 'sharp';

const ROOT = resolve(import.meta.dirname, '../..');

/** Must match src/design-system/components/BrandMark/BrandMark.tsx. */
const BOWL = { cx: 534, cy: 405, r: 187 };
const STEM = { x: 302, y: 218, w: 104, h: 585, rx: 52 };
const SPARK = { cx: 551, cy: 407, rx: 106, ry: 106, waist: 0.34 };
const STOPS = ['#A68AF9', '#8039E9', '#DA2778'];

/**
 * Must match AnimatedSplash's MARK_SIZE.
 *
 * Larger than it looks: the glyph fills only ~41% of the width of its 1024
 * box, because the icon's own padding is baked into those coordinates. At
 * 116 the visible mark was a 48pt smudge on a 393pt screen.
 */
const MARK_POINTS = 240;

const circle = ({ cx, cy, r }) =>
  `M ${cx - r},${cy} a ${r},${r} 0 1,0 ${2 * r},0 a ${r},${r} 0 1,0 ${-2 * r},0 Z`;

const sparkle = ({ cx, cy, rx, ry, waist }) => {
  const hx = rx * waist;
  const hy = ry * waist;
  return [
    `M ${cx},${cy - ry}`,
    `C ${cx},${cy - hy} ${cx + hx},${cy} ${cx + rx},${cy}`,
    `C ${cx + hx},${cy} ${cx},${cy + hy} ${cx},${cy + ry}`,
    `C ${cx},${cy + hy} ${cx - hx},${cy} ${cx - rx},${cy}`,
    `C ${cx - hx},${cy} ${cx},${cy - hy} ${cx},${cy - ry}`,
    'Z',
  ].join(' ');
};

/** The glyph alone, on transparency — the background is drawn separately. */
const markSvg = (size) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 1024 1024">
  <rect x="${STEM.x}" y="${STEM.y}" width="${STEM.w}" height="${STEM.h}" rx="${STEM.rx}" fill="#fff"/>
  <path d="${circle(BOWL)} ${sparkle(SPARK)}" fill="#fff" fill-rule="evenodd"/>
</svg>`;

const gradientSvg = (w, h) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    ${STOPS.map((c, i) => `<stop offset="${i / (STOPS.length - 1)}" stop-color="${c}"/>`).join('')}
  </linearGradient></defs>
  <rect width="${w}" height="${h}" fill="url(#g)"/>
</svg>`;

const write = async (svg, path) => {
  mkdirSync(resolve(path, '..'), { recursive: true });
  await sharp(Buffer.from(svg)).png().toFile(path);
  console.log(`  ${path.replace(`${ROOT}/`, '')}`);
};

console.log('\niOS');
const iosSet = `${ROOT}/ios/AIPromptGallery/Images.xcassets/SplashMark.imageset`;
for (const scale of [1, 2, 3]) {
  const suffix = scale === 1 ? '' : `@${scale}x`;
  await write(markSvg(MARK_POINTS * scale), `${iosSet}/mark${suffix}.png`);
}
writeFileSync(
  `${iosSet}/Contents.json`,
  `${JSON.stringify(
    {
      images: [1, 2, 3].map((scale) => ({
        filename: scale === 1 ? 'mark.png' : `mark@${scale}x.png`,
        idiom: 'universal',
        scale: `${scale}x`,
      })),
      info: { author: 'xcode', version: 1 },
    },
    null,
    2,
  )}\n`,
);

// Scaled with aspectFill, so one large image covers every device. A stretched
// gradient is indistinguishable from a correctly-sized one; a stretched MARK
// would not be, which is why they are separate layers.
const iosBg = `${ROOT}/ios/AIPromptGallery/Images.xcassets/SplashBackground.imageset`;
await write(gradientSvg(1290, 2796), `${iosBg}/background.png`);
writeFileSync(
  `${iosBg}/Contents.json`,
  `${JSON.stringify(
    {
      images: [
        { filename: 'background.png', idiom: 'universal', scale: '1x' },
        { idiom: 'universal', scale: '2x' },
        { idiom: 'universal', scale: '3x' },
      ],
      info: { author: 'xcode', version: 1 },
    },
    null,
    2,
  )}\n`,
);

console.log('\nAndroid');
// Android draws the gradient with a <shape>, which supports exactly the three
// stops this mark needs — so only the glyph has to be a bitmap.
const DENSITIES = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
for (const [bucket, scale] of Object.entries(DENSITIES)) {
  await write(
    markSvg(Math.round(MARK_POINTS * scale)),
    `${ROOT}/android/app/src/main/res/drawable-${bucket}/splash_mark.png`,
  );
}

console.log(`\nDone. The mark box is ${MARK_POINTS}pt/dp on both platforms — the same`);
console.log('number as MARK_SIZE in AnimatedSplash, which is what makes the handover');
console.log('invisible. Change one and you must change the other.\n');
