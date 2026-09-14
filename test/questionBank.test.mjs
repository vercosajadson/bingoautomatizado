import test from 'node:test';
import assert from 'node:assert/strict';
import { parseQuestionBank } from '../src/questionBank.mjs';

test('parseQuestionBank parses valid "pergunta | resposta" lines', () => {
  const { entries, ignored } = parseQuestionBank('10% de 20 | 2\n50% de 6 | 3');
  assert.deepEqual(entries, [
    { question: '10% de 20', answer: '2' },
    { question: '50% de 6', answer: '3' },
  ]);
  assert.equal(ignored, 0);
});

test('parseQuestionBank trims whitespace around question and answer', () => {
  const { entries } = parseQuestionBank('  10% de 20   |   2  ');
  assert.deepEqual(entries, [{ question: '10% de 20', answer: '2' }]);
});

test('parseQuestionBank ignores blank lines without counting them', () => {
  const { entries, ignored } = parseQuestionBank('10% de 20 | 2\n\n\n50% de 6 | 3');
  assert.equal(entries.length, 2);
  assert.equal(ignored, 0);
});

test('parseQuestionBank counts and skips lines missing the separator', () => {
  const { entries, ignored } = parseQuestionBank('10% de 20 | 2\nlinha sem separador\n50% de 6 | 3');
  assert.equal(entries.length, 2);
  assert.equal(ignored, 1);
});

test('parseQuestionBank counts and skips lines with an empty question or answer', () => {
  const { entries, ignored } = parseQuestionBank('10% de 20 | 2\n | 5\n50% de 6 | ');
  assert.equal(entries.length, 1);
  assert.equal(ignored, 2);
});

test('parseQuestionBank only uses the first two "|"-separated segments', () => {
  const { entries } = parseQuestionBank('10% de 20 | 2 | nota extra');
  assert.deepEqual(entries, [{ question: '10% de 20', answer: '2' }]);
});
