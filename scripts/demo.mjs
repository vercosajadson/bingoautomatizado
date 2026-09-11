import {
  findDuplicateAnswers,
  generateUniqueCards,
  generateTickets,
  estimateSingleCardDraws,
  simulateGameLength,
  checkBankSizeRatio,
} from '../src/index.mjs';

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

const duplicates = findDuplicateAnswers(bank);
if (duplicates.length > 0) {
  console.error('Respostas duplicadas encontradas:', duplicates);
  process.exit(1);
}

const singleCardEstimate = estimateSingleCardDraws(bank.length, cellsPerCard);
console.log(`Estimativa rápida (1 cartela isolada): ~${singleCardEstimate.toFixed(1)} sorteios até completar`);

const { percentOfBankUsed } = simulateGameLength(bank.length, cellsPerCard, cardCount, { trials: 300 });
const issues = checkBankSizeRatio({ bankSize: bank.length, cellsPerCard, cardCount, percentOfBankUsed });

console.log(`Estimativa (${cardCount} cartelas em jogo): usa ~${percentOfBankUsed.toFixed(0)}% do banco até o 1º vencedor`);
console.log('Avisos:', issues.map((i) => `[${i.level}] ${i.message}`).join(' | '));

const cards = generateUniqueCards(bank, cellsPerCard, cardCount);
console.log(`Geradas ${cards.length} cartelas de ${cellsPerCard} respostas.`);

const { withAnswer, withoutAnswer } = generateTickets(bank);
console.log(`Geradas ${withAnswer.length} fichas com gabarito e ${withoutAnswer.length} sem gabarito.`);
