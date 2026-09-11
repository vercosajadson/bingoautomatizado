import test from 'node:test';
import assert from 'node:assert/strict';
import { findDuplicateAnswers } from '../src/cardGenerator.mjs';

const sampleBank = [
  { question: '10% de 20', answer: '2' },
  { question: '50% de 6', answer: '3' },
  { question: '25% de 16', answer: '4' },
  { question: '20% de 25', answer: '5' },
  { question: '50% de 12', answer: '6' },
  { question: '10% de 70', answer: '7' },
  { question: '25% de 32', answer: '8' },
  { question: '50% de 18', answer: '9' },
  { question: '10% de 100', answer: '10' },
];

test('findDuplicateAnswers returns empty array when all answers are unique', () => {
  assert.deepEqual(findDuplicateAnswers(sampleBank), []);
});

test('findDuplicateAnswers groups entries sharing the same answer, ignoring case and surrounding spaces', () => {
  const bankWithDuplicates = [
    { question: 'Capital da França', answer: 'Paris' },
    { question: 'Cidade das luzes', answer: ' paris ' },
    { question: 'Capital do Brasil', answer: 'Brasília' },
  ];
  const duplicates = findDuplicateAnswers(bankWithDuplicates);
  assert.equal(duplicates.length, 1);
  assert.equal(duplicates[0].length, 2);
});

import { generateUniqueCards } from '../src/cardGenerator.mjs';

function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

test('generateUniqueCards rejects cellsPerCard greater than bank size', () => {
  assert.throws(() => generateUniqueCards(sampleBank, 5, 20), RangeError);
});

test('generateUniqueCards produces the requested number of cards, each with the right size', () => {
  const cards = generateUniqueCards(sampleBank, 5, 4, { random: mulberry32(1) });
  assert.equal(cards.length, 5);
  for (const card of cards) {
    assert.equal(card.length, 4);
  }
});

test('generateUniqueCards never produces two cards with the same set of answers', () => {
  const cards = generateUniqueCards(sampleBank, 9, 4, { random: mulberry32(7) });
  const keys = cards.map((card) => card.map((entry) => entry.answer).sort().join(','));
  assert.equal(new Set(keys).size, keys.length);
});

test('generateUniqueCards throws a descriptive error when not enough unique combinations exist', () => {
  const tinyBank = sampleBank.slice(0, 4); // C(4,4) = 1 única combinação possível
  assert.throws(
    () => generateUniqueCards(tinyBank, 2, 4, { random: mulberry32(3) }),
    /Não foi possível gerar/
  );
});
