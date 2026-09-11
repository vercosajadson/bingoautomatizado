import test from 'node:test';
import assert from 'node:assert/strict';
import { estimateSingleCardDraws, simulateGameLength, checkBankSizeRatio } from '../src/gameMath.mjs';

test('estimateSingleCardDraws matches analytic formula k*(N+1)/(k+1)', () => {
  // N=25, k=9 -> 9*26/10 = 23.4 (cenário do PDF de exemplo)
  assert.equal(estimateSingleCardDraws(25, 9), 23.4);
});

test('estimateSingleCardDraws rejects non-positive inputs', () => {
  assert.throws(() => estimateSingleCardDraws(0, 9), RangeError);
  assert.throws(() => estimateSingleCardDraws(25, 0), RangeError);
});

function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

test('simulateGameLength stays within the empirically validated range for the example scenario (N=25,k=9,C=40)', () => {
  const result = simulateGameLength(25, 9, 40, { trials: 500, random: mulberry32(42) });
  // Faixa observada na simulação de referência feita durante o design (média ~17.9, p10-p90 16-20)
  assert.ok(result.meanDraws > 14 && result.meanDraws < 22, `meanDraws fora do esperado: ${result.meanDraws}`);
  assert.ok(result.percentOfBankUsed > 55 && result.percentOfBankUsed < 85);
});

test('simulateGameLength rejects cellsPerCard greater than bankSize', () => {
  assert.throws(() => simulateGameLength(5, 9, 10), RangeError);
});

test('simulateGameLength rejects non-positive trials', () => {
  assert.throws(() => simulateGameLength(25, 9, 40, { trials: 0 }), RangeError);
});

test('checkBankSizeRatio flags bank-too-small as an error', () => {
  const issues = checkBankSizeRatio({ bankSize: 9, cellsPerCard: 9, percentOfBankUsed: 100 });
  assert.equal(issues.length, 1);
  assert.equal(issues[0].code, 'bank-too-small');
  assert.equal(issues[0].level, 'error');
});

test('checkBankSizeRatio flags bank-small warning below 1.5x cellsPerCard', () => {
  const issues = checkBankSizeRatio({ bankSize: 12, cellsPerCard: 9, percentOfBankUsed: 70 });
  assert.ok(issues.some((i) => i.code === 'bank-small'));
});

test('checkBankSizeRatio flags bank-large warning below 40% pool usage', () => {
  const issues = checkBankSizeRatio({ bankSize: 50, cellsPerCard: 9, percentOfBankUsed: 30 });
  assert.ok(issues.some((i) => i.code === 'bank-large'));
});

test('checkBankSizeRatio returns a single ok entry when balanced', () => {
  const issues = checkBankSizeRatio({ bankSize: 50, cellsPerCard: 9, percentOfBankUsed: 67 });
  assert.deepEqual(issues, [
    { level: 'ok', code: 'ok', message: 'Proporção de perguntas por cartela está balanceada.' },
  ]);
});

test('checkBankSizeRatio flags combinations-tight warning when few unique card combinations exist relative to cardCount', () => {
  // C(10,9) = 10, requesting 40 unique cards from that is tight
  const issues = checkBankSizeRatio({ bankSize: 10, cellsPerCard: 9, cardCount: 40, percentOfBankUsed: 90 });
  assert.ok(issues.some((i) => i.code === 'combinations-tight'));
});

test('checkBankSizeRatio does not flag combinations-tight when combinations are plentiful', () => {
  const issues = checkBankSizeRatio({ bankSize: 50, cellsPerCard: 9, cardCount: 40, percentOfBankUsed: 67 });
  assert.ok(!issues.some((i) => i.code === 'combinations-tight'));
});

test('checkBankSizeRatio skips the combinations-tight check when cardCount is not provided', () => {
  const issues = checkBankSizeRatio({ bankSize: 50, cellsPerCard: 9, percentOfBankUsed: 67 });
  assert.deepEqual(issues, [
    { level: 'ok', code: 'ok', message: 'Proporção de perguntas por cartela está balanceada.' },
  ]);
});
