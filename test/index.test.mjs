import test from 'node:test';
import assert from 'node:assert/strict';
import * as engine from '../src/index.mjs';

const expectedExports = [
  'estimateSingleCardDraws',
  'simulateGameLength',
  'checkBankSizeRatio',
  'findDuplicateAnswers',
  'generateUniqueCards',
  'generateTickets',
];

test('index.mjs re-exports the full public engine API as functions', () => {
  for (const name of expectedExports) {
    assert.equal(typeof engine[name], 'function', `${name} deveria ser exportada como função`);
  }
});
