import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ANALYSIS_VERSION, chooseOrientation, textScore } from '../scripts/poster-analysis.mjs';

test('orientation requires enough readable text and a clear advantage over other rotations', () => {
  assert.equal(chooseOrientation([3, 151, 4, 5]).rotation, 90);
  assert.equal(chooseOrientation([65, 8, 2, 4]).rotation, 0);
  assert.equal(chooseOrientation([2, 3, 50, 4]).rotation, 180);
  assert.equal(chooseOrientation([2, 3, 4, 50]).rotation, 270);
  assert.equal(chooseOrientation([4.41, 11.72, 7.16, 4.53]).rotation, 90);
  for (const scores of [[0, 0, 0, 0], [1, 7, 2, 3], [30, 32, 0, 0], [1, 15, 13, 0]]) {
    assert.equal(chooseOrientation(scores).rotation, 0);
    assert.equal(chooseOrientation(scores).status, 'inconclusive');
  }
  assert.throws(() => chooseOrientation([1, NaN, 2, 3]));
  assert.throws(() => chooseOrientation([1, 2, 3, 4], [1, 2, -1, 3]));
});

test('Kanji, Hiragana and Katakana contribute to Japanese OCR scores, including single Kanji', () => {
  const row = text => `5\t1\t1\t1\t1\t1\t0\t0\t50\t20\t90\t${text}`;
  assert.ok(textScore(['header', row('警視庁'), row('今'), row('ひとり'), row('キラー')].join('\n')) > 8);
});

test('calibration posters rotate clockwise with OCR or upright face evidence; upright controls stay upright', () => {
  const samples = JSON.parse(readFileSync(new URL('./fixtures/poster-orientations.json', import.meta.url), 'utf8'));
  for (const sample of samples) {
    assert.equal(chooseOrientation(sample.scores, sample.faceScores).rotation, sample.expectedRotation, sample.source);
  }
  assert.equal(chooseOrientation([0, 0, 0, 0], [6, 7, 0, 0]).status, 'inconclusive');
  assert.equal(chooseOrientation([0, 0, 0, 0], [0, 4, 0, 0]).status, 'inconclusive');
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
    if (result.version === ANALYSIS_VERSION) {
      assert.ok(['ocr', 'faces', 'inconclusive'].includes(result.method));
      assert.ok(result.faceScores.length === 4 && result.faceScores.every(score => Number.isFinite(score) && score >= 0));
    }
  }
});
