export const ANALYSIS_VERSION = 'tesseract7-eng-jpn-normalized-v1';
export const ROTATIONS = [0, 90, 180, 270];

export function textScore(tsv = '') {
  return tsv.trim().split('\n').slice(1).reduce((score, line) => {
    const columns = line.split('\t');
    const confidence = Number(columns[10]);
    const characters = columns[11]?.match(/[\p{L}\p{N}]/gu) || [];
    if (columns[0] !== '5' || confidence < 65 || !Number.isFinite(confidence) || !characters.length) return score;
    if (characters.length < 2 && !/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u.test(columns[11])) return score;
    return score + characters.length * confidence / 100;
  }, 0);
}

export function chooseOrientation(scores) {
  if (scores.length !== 4 || scores.some(value => !Number.isFinite(value) || value < 0)) throw new Error('Expected four nonnegative OCR scores.');
  const ranked = scores.map((score, index) => ({ rotation: ROTATIONS[index], score })).sort((a, b) => b.score - a.score);
  const [best, second] = ranked;
  // Poster art can resemble letters: leave uncertain images in their original orientation.
  const confident = best.score >= 25 && best.score >= second.score * 2 && best.score - second.score >= 12;
  return { rotation: confident ? best.rotation : 0, status: confident ? 'confident' : 'inconclusive', scores: scores.map(score => Math.round(score * 100) / 100) };
}
