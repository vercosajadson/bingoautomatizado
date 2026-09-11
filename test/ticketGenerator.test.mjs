import test from 'node:test';
import assert from 'node:assert/strict';
import { generateTickets } from '../src/ticketGenerator.mjs';

const bank = [
  { question: '10% de 20', answer: '2' },
  { question: '50% de 6', answer: '3' },
];

test('generateTickets creates one withAnswer ticket per bank entry, preserving question and answer', () => {
  const { withAnswer } = generateTickets(bank);
  assert.deepEqual(withAnswer, bank);
});

test('generateTickets creates one withoutAnswer ticket per bank entry, omitting the answer field', () => {
  const { withoutAnswer } = generateTickets(bank);
  assert.equal(withoutAnswer.length, bank.length);
  for (const ticket of withoutAnswer) {
    assert.ok('question' in ticket);
    assert.ok(!('answer' in ticket));
  }
});

test('generateTickets preserves bank order in both sets', () => {
  const { withAnswer, withoutAnswer } = generateTickets(bank);
  assert.equal(withAnswer[0].question, bank[0].question);
  assert.equal(withoutAnswer[1].question, bank[1].question);
});
