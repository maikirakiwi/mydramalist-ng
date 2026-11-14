import { readFile, writeFile, rename, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { createWorker } from 'tesseract.js';
import { ANALYSIS_VERSION, ROTATIONS, chooseOrientation, textScore } from './poster-analysis.mjs';

const dataDirectory = new URL('../public/data/', import.meta.url);
const manifestPath = new URL('posters.json', dataDirectory);
const { items } = JSON.parse(await readFile(new URL('dramas.json', dataDirectory), 'utf8'));
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const sources = [...new Set(items.map(item => item.poster.replace('_4t.', '_4f.')))];
const pending = sources.filter(source => process.env.REFRESH_POSTERS === '1' || manifest[source]?.version !== ANALYSIS_VERSION);
if (!pending.length) {
  console.log(`All ${sources.length} posters already analyzed; no image downloads or OCR needed.`);
} else {
  const cachePath = new URL('../.cache/tesseract/', import.meta.url);
  await mkdir(cachePath, { recursive: true });
  const worker = await createWorker('eng+jpn', 1, { cachePath: cachePath.pathname });
  await worker.setParameters({ tessedit_pageseg_mode: '11' });
  console.log('OCR languages: eng+jpn (Japanese includes Kanji, Hiragana and Katakana).');
  let failed = 0;
  try {
    for (const [index, source] of pending.entries()) {
      try {
        const url = new URL(source);
        if (url.protocol !== 'https:' || url.hostname !== 'i.mydramalist.com') throw new Error('Unexpected poster host.');
        const response = await fetch(url, { signal: AbortSignal.timeout(30000), redirect: 'error' });
        if (!response.ok) throw new Error(`Image request returned ${response.status}.`);
        const bytes = Buffer.from(await response.arrayBuffer());
        if (bytes.length > 20 * 1024 * 1024) throw new Error('Poster exceeds 20 MiB limit.');
        const image = sharp(bytes, { limitInputPixels: 40_000_000 });
        const { width, height } = await image.metadata();
        const scores = [];
        for (const rotation of ROTATIONS) {
          const normalized = await image.clone().autoOrient().rotate(rotation).resize({ width: 2000 }).grayscale().normalize().png().toBuffer();
          const { data } = await worker.recognize(normalized, {}, { text: false, tsv: true });
          scores.push(textScore(data.tsv));
        }
        const uprightBytes = await image.clone().autoOrient().png().toBuffer();
        const faces = spawnSync('python3', [fileURLToPath(new URL('./poster-faces.py', import.meta.url))], {
          input: uprightBytes, timeout: 30000, maxBuffer: 20 * 1024 * 1024,
        });
        if (faces.error || faces.status !== 0) throw new Error(`Face analysis failed: ${faces.error?.message || faces.stderr.toString().trim()}`);
        const result = chooseOrientation(scores, JSON.parse(faces.stdout.toString()));
        manifest[source] = { version: ANALYSIS_VERSION, sha256: createHash('sha256').update(bytes).digest('hex'), width, height, ...result };
        // Save each completed result atomically so an interrupted run retains its work.
        const sorted = Object.fromEntries(Object.entries(manifest).sort(([a], [b]) => a.localeCompare(b)));
        await writeFile(`${manifestPath.pathname}.tmp`, `${JSON.stringify(sorted, null, 2)}\n`);
        await rename(`${manifestPath.pathname}.tmp`, manifestPath);
        console.log(`[${index + 1}/${pending.length}] ${source}: ${result.rotation}° (${result.method}; OCR ${result.scores.join(', ')}; faces ${result.faceScores.join(', ')})`);
      } catch (error) {
        failed++;
        console.warn(`::warning::Poster analysis failed for ${source}: ${error.message}. Previous result retained; will retry next run.`);
      }
    }
  } finally {
    await worker.terminate();
  }
  if (failed) process.exitCode = 1;
}
