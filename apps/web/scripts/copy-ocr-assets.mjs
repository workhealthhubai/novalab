// Copies the self-hosted OCR runtime into public/ocr so the browser never loads it from a CDN:
// tesseract.js worker + WASM cores (only the variant matching the CPU is downloaded at runtime),
// the bundled OCR-B/MRZ model shared with the API, and the zxing barcode reader.
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const here = dirname(fileURLToPath(import.meta.url));
const target = resolve(here, '../public/ocr');
mkdirSync(target, { recursive: true });

const tesseractDist = dirname(require.resolve('tesseract.js/dist/worker.min.js'));
// tesseract.js-core is a dependency of tesseract.js, so resolve it from there (pnpm keeps it out of our node_modules).
const coreDir = dirname(
  require.resolve('tesseract.js-core/package.json', { paths: [tesseractDist] }),
);
// zxing-wasm only exports its entry points, so locate the package directory via node_modules.
const zxingDir = resolve(here, '../node_modules/zxing-wasm');
const model = resolve(here, '../../api/tessdata/mrz.traineddata');

const files = [
  join(tesseractDist, 'worker.min.js'),
  ...['relaxedsimd-lstm', 'simd-lstm', 'lstm'].flatMap((variant) => [
    join(coreDir, `tesseract-core-${variant}.wasm.js`),
    join(coreDir, `tesseract-core-${variant}.wasm`),
  ]),
  join(zxingDir, 'dist/reader/zxing_reader.wasm'),
  model,
];

for (const file of files) {
  if (!existsSync(file)) throw new Error(`OCR asset missing: ${file}`);
  copyFileSync(file, join(target, file.split('/').pop()));
}
console.log(`ocr assets → ${target}`);
