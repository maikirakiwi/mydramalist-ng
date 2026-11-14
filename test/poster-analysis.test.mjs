import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { chooseOrientation, textScore } from '../scripts/poster-analysis.mjs';

test('orientation requires enough readable text and a clear advantage over other rotations', () => {
  assert.equal(chooseOrientation([3, 151, 4, 5]).rotation, 90);
  assert.equal(chooseOrientation([65, 8, 2, 4]).rotation, 0);
  assert.equal(chooseOrientation([2, 3, 50, 4]).rotation, 180);
  assert.equal(chooseOrientation([2, 3, 4, 50]).rotation, 270);
  for (const scores of [[0, 0, 0, 0], [1, 9, 2, 3], [30, 32, 0, 0], [1, 15, 8, 0], [4.88, 7.77, 17.66, 5.7], [20.46, 1.68, 39.14, 10.03]]) {
    assert.equal(chooseOrientation(scores).rotation, 0);
    assert.equal(chooseOrientation(scores).status, 'inconclusive');
  }
  assert.throws(() => chooseOrientation([1, NaN, 2, 3]));
});

test('OCR scoring ignores layout rows, low-confidence guesses, punctuation and single Latin noise', () => {
  const header = 'level\tpage_num\tblock_num\tpar_num\tline_num\tword_num\tleft\ttop\twidth\theight\tconf\ttext';
  const row = (confidence, text, level = 5) => `${level}\t1\t1\t1\t1\t1\t0\t0\t50\t20\t${confidence}\t${text}`;
  const score = textScore([header, row(90, 'VIVANT'), row(80, '劇場'), row(60, 'wrong'), row(99, '!'), row(99, 'x'), row(-1, 'layout', 1)].join('\n'));
  assert.equal(score, 7);
  assert.equal(textScore(), 0);
});

test('saved poster analysis contains valid rotations and reproducible evidence', () => {
  const manifest = JSON.parse(readFileSync(new URL('../public/data/posters.json', import.meta.url), 'utf8'));
  for (const [source, result] of Object.entries(manifest)) {
    assert.ok(source.startsWith('https://i.mydramalist.com/'));
    assert.ok([0, 90, 180, 270].includes(result.rotation));
    assert.match(result.sha256, /^[a-f0-9]{64}$/);
    assert.ok(result.width > 0 && result.height > 0);
    assert.ok(['confident', 'inconclusive'].includes(result.status));
    assert.ok(result.scores.length === 4 && result.scores.every(score => Number.isFinite(score) && score >= 0));
    assert.ok(result.version);
  }
});
