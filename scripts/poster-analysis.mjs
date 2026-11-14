export const ANALYSIS_VERSION = 'eng-jpn-faces-v2';
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

export function chooseOrientation(scores, faceScores = [0, 0, 0, 0]) {
  for (const values of [scores, faceScores]) {
    if (values.length !== 4 || values.some(value => !Number.isFinite(value) || value < 0)) throw new Error('Expected four nonnegative orientation scores.');
  }
  const ranked = scores.map((score, index) => ({ rotation: ROTATIONS[index], score })).sort((a, b) => b.score - a.score);
  const [best, second] = ranked;
  const faces = faceScores.map((score, index) => ({ rotation: ROTATIONS[index], score })).sort((a, b) => b.score - a.score);
  const strongText = best.score >= 25 && best.score >= second.score * 2 && best.score - second.score >= 12;
  const clearFaces = faces[0].score >= 5.5 && faces[0].score >= faces[1].score * 1.5 && faces[0].score - faces[1].score >= 2;
  const readableText = best.score >= 8 && best.score >= second.score * 1.4 && best.score - second.score >= 3;
  // shortcut: stylized text can fool OCR; expand the labeled calibration set if false rotations recur.
  const method = strongText ? 'ocr' : clearFaces ? 'faces' : readableText ? 'ocr' : 'inconclusive';
  return {
    rotation: method === 'inconclusive' ? 0 : method === 'faces' ? faces[0].rotation : best.rotation,
    status: method === 'inconclusive' ? 'inconclusive' : 'confident', method,
    scores: scores.map(score => Math.round(score * 100) / 100), faceScores,
  };
}
