import test from 'node:test';
import assert from 'node:assert/strict';
import * as engine from '../src/index.mjs';

const expectedFunctionExports = [
  'estimateSingleCardDraws',
  'simulateGameLength',
  'checkBankSizeRatio',
  'findDuplicateAnswers',
  'generateUniqueCards',
  'generateTickets',
];

test('index.mjs re-exports the full public engine API as functions', () => {
  for (const name of expectedFunctionExports) {
    assert.equal(typeof engine[name], 'function', `${name} deveria ser exportada como função`);
  }
});

test('index.mjs re-exports the default pacing constants', () => {
  assert.equal(engine.DEFAULT_CELLS_PER_CARD, 9);
  assert.equal(engine.DEFAULT_CARD_COUNT, 40);
});

test('the full pipeline (validate -> generate cards -> generate tickets) produces internally consistent output', () => {
  const bank = [
    { question: '10% de 20', answer: '2' },
    { question: '50% de 6', answer: '3' },
    { question: '25% de 16', answer: '4' },
    { question: '20% de 25', answer: '5' },
    { question: '50% de 12', answer: '6' },
    { question: '10% de 70', answer: '7' },
    { question: '25% de 32', answer: '8' },
    { question: '50% de 18', answer: '9' },
    { question: '10% de 100', answer: '10' },
    { question: '25% de 60', answer: '15' },
    { question: '20% de 60', answer: '12' },
    { question: '50% de 28', answer: '14' },
  ];
  const cellsPerCard = 9;
  const cardCount = 5;

  assert.deepEqual(engine.findDuplicateAnswers(bank), []);

  const cards = engine.generateUniqueCards(bank, cellsPerCard, cardCount);
  assert.equal(cards.length, cardCount);

  const bankAnswers = new Set(bank.map((entry) => entry.answer));
  for (const card of cards) {
    assert.equal(card.length, cellsPerCard, 'every card must have exactly cellsPerCard entries');
    const answersInCard = card.map((entry) => entry.answer);
    assert.equal(
      new Set(answersInCard).size,
      answersInCard.length,
      'no answer may repeat within a single card'
    );
    for (const entry of card) {
      assert.ok(bankAnswers.has(entry.answer), 'every card entry must come from the bank');
    }
  }

  const { withAnswer, withoutAnswer } = engine.generateTickets(bank);
  const ticketAnswers = new Set(withAnswer.map((t) => t.answer));
  for (const card of cards) {
    for (const entry of card) {
      assert.ok(ticketAnswers.has(entry.answer), 'every card answer must appear in the withAnswer tickets');
    }
  }
  assert.equal(withoutAnswer.length, bank.length);
});
