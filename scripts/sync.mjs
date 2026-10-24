import { readFile, writeFile, rename, mkdir } from 'node:fs/promises';
import { parseList, parseDetail, SOURCE } from './parse.mjs';

const snapshotPath = new URL('../public/data/dramas.json', import.meta.url);
let previous;
try { previous = JSON.parse(await readFile(snapshotPath, 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
async function getHtml(url) {
  try {
    const direct = await fetch(url, { signal: AbortSignal.timeout(30000), headers: { 'User-Agent': 'MaimaiDramaJournal/1.0 (public watchlist snapshot)' } });
    if (direct.ok) {
      const html = await direct.text();
      if (!html.includes('Just a moment...')) return html;
    }
  } catch (error) { console.warn(`Direct source unavailable: ${error.message}; trying public rendering.`); }
  const response = await fetch(`https://r.jina.ai/${url}`, { signal: AbortSignal.timeout(90000), headers: { 'X-Return-Format': 'html' } });
  if (!response.ok) throw new Error(`Public rendering returned ${response.status} for ${url}`);
  return response.text();
}

const html = process.env.MDL_HTML_FILE ? await readFile(process.env.MDL_HTML_FILE, 'utf8') : await getHtml(SOURCE);
const { items, filters } = parseList(html);
const oldById = new Map(previous?.items.map(item => [item.id, item]) || []);
for (const item of items) {
  const old = oldById.get(item.id);
  if (old) Object.assign(item, { nativeTitle: old.nativeTitle, mdlscore: old.mdlscore, rank: old.rank, tags: old.tags });
}
// Detail metadata is cached; viewing status and progress are always refreshed from the list.
let failed = 0;
for (const item of items) {
  if (item.nativeTitle && !process.env.REFRESH_DETAILS) continue;
  try {
    Object.assign(item, parseDetail(await getHtml(item.url)));
    console.log(`Native title: ${item.title} → ${item.nativeTitle}`);
  } catch (error) {
    failed++;
    console.warn(`${item.title}: ${error.message}`);
  }
  await new Promise(resolve => setTimeout(resolve, 3100));
}
if (failed && !previous) throw new Error(`${failed} native titles unavailable; refusing incomplete first import.`);
if (items.some(item => !item.nativeTitle)) throw new Error('New native titles unavailable; keeping last complete snapshot.');
const snapshot = { username: 'notmaimai', name: 'Maimai', source: SOURCE, fetchedAt: new Date().toISOString(), filters, items };
await mkdir(new URL('../public/data/', import.meta.url), { recursive: true });
await writeFile(`${snapshotPath.pathname}.tmp`, `${JSON.stringify(snapshot, null, 2)}\n`);
await rename(`${snapshotPath.pathname}.tmp`, snapshotPath);
console.log(`Saved ${items.length} titles. ${failed} cached metadata fallbacks.`);
