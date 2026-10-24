import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { filterOptions, selectItems, SORTS, STATUSES } from '../src/list.mjs';
import { parseList, parseDetail } from '../scripts/parse.mjs';

const items = [
  { id: '1', position: 1, nativeTitle: '今際の国のアリス', title: 'Alice in Borderland', country: 'Japan', year: 2020, status: 'Completed', genres: ['Mystery', 'Thriller'], tags: ['Survival'], score: 0, finished: '2026-08-04', premiere: '2020-12-10' },
  { id: '2', position: 2, nativeTitle: 'VIVANT', title: 'Vivant', country: 'Japan', year: 2026, status: 'Watching', genres: ['Mystery', 'Action'], tags: ['Investigation'], score: 8, finished: null, premiere: '2026-07-26' },
  { id: '3', position: 3, nativeTitle: 'テスト', title: 'Test', country: 'Japan', year: 2026, status: 'Dropped', genres: ['Thriller'], tags: [], score: 0, finished: '2026-07-01' },
];
test('default sort is latest premiere first, with unknown dates last and explicit order preserved', () => {
  assert.deepEqual(selectItems(items, {}).map(item => item.id), ['2', '1', '3']);
  assert.deepEqual(selectItems(items, {}, 'position', 'asc').map(item => item.id), ['1', '2', '3']);
});
test('filter options contain only unique values matched by actual shows', () => {
  assert.deepEqual(filterOptions(items, 'country'), ['Japan']);
  assert.deepEqual(filterOptions(items, 'genres'), ['Action', 'Mystery', 'Thriller']);
  assert.deepEqual(filterOptions(items, 'tags'), ['Investigation', 'Survival']);
  assert.deepEqual(filterOptions(items, 'year'), [2020, 2026]);
  assert.deepEqual(filterOptions(items, 'category'), []);
  assert.deepEqual(filterOptions([], 'tags'), []);
});
test('search supports native and English titles, case-insensitively', () => {
  assert.deepEqual(selectItems(items, { q: '今際' }).map(i => i.id), ['1']);
  assert.deepEqual(selectItems(items, { q: ' ALICE ' }).map(i => i.id), ['1']);
});
test('all selected genres and tags must match, alongside status and country', () => {
  assert.deepEqual(selectItems(items, { country: 'Japan', status: 'Watching', genres: ['Mystery', 'Action'], tags: ['Investigation'] }).map(i => i.id), ['2']);
  assert.equal(selectItems(items, { genres: ['Mystery', 'Thriller'], tags: ['Investigation'] }).length, 0);
  assert.equal(selectItems(items, { year: '2026' }).length, 2);
});
test('sorting is stable, preserves zero ratings, puts unknown dates last in both directions, and never mutates source', () => {
  assert.deepEqual(selectItems(items, {}, 'score', 'desc').map(i => i.id), ['2', '1', '3']);
  assert.deepEqual(selectItems(items, {}, 'finished', 'desc').map(i => i.id), ['1', '3', '2']);
  assert.deepEqual(selectItems(items, {}, 'finished', 'asc').map(i => i.id), ['3', '1', '2']);
  assert.deepEqual(items.map(i => i.id), ['1', '2', '3']);
  assert.equal(Object.keys(SORTS).length, 18);
  assert.equal(STATUSES.length, 8);
});
const fixture = `<script>window.dramalist_json = {"load_more":false};</script><table><tr id="ml123"><td class="msv2-i-title"><a class="title" href="/123-example">Example</a><img data-src="https://i.mydramalist.com/example.jpg"></td><td class="msv2-i-status">Completed</td><td class="msv2-i-year">2024</td><td class="msv2-i-genres">Mystery, Drama</td><td><span class="num-seen">8</span></td></tr></table>`;
test('list parser extracts real fields and rejects blocked, empty, duplicate, and paginated results', () => {
  const result = parseList(fixture);
  assert.equal(result.items[0].title, 'Example');
  assert.equal(result.items[0].watched, 8);
  assert.deepEqual(result.items[0].genres, ['Mystery', 'Drama']);
  assert.throws(() => parseList('<html>Just a moment...</html>'));
  assert.throws(() => parseList(fixture.replace(/<tr.*?<\/tr>/, '')));
  assert.throws(() => parseList(fixture.replace('false', 'true')));
  assert.throws(() => parseList(fixture + fixture));
});
test('native title, score, rank and tags are parsed without inventing unavailable metadata', () => {
  const detail = parseDetail('<li><b>Native Title:</b> <a>今際の国のアリス</a></li><div>Score: 8.7 Ranked: #123</div><a href="/search?adv=titles&th=42">Survival</a>');
  assert.equal(detail.nativeTitle, '今際の国のアリス');
  assert.equal(detail.mdlscore, 8.7);
  assert.equal(detail.rank, 123);
  assert.deepEqual(detail.tags, ['Survival']);
  assert.throws(() => parseDetail('<p>Unavailable</p>'));
});
test('published snapshot has complete native titles, unique IDs, valid links, and valid progress', () => {
  const data = JSON.parse(readFileSync(new URL('../public/data/dramas.json', import.meta.url), 'utf8'));
  assert.ok(data.items.length > 0);
  assert.ok(Number.isFinite(Date.parse(data.fetchedAt)));
  assert.equal(new Set(data.items.map(i => i.id)).size, data.items.length);
  for (const item of data.items) {
    assert.ok(item.nativeTitle && item.title);
    assert.ok(STATUSES.includes(item.status));
    assert.ok(item.url.startsWith('https://mydramalist.com/'));
    assert.ok(item.poster.startsWith('https://i.mydramalist.com/'));
    assert.ok(item.watched >= 0 && item.episodes >= 0);
  }
});
