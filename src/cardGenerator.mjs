export function findDuplicateAnswers(bank) {
  const seen = new Map();
  for (const entry of bank) {
    const key = normalizeAnswer(entry.answer);
    if (!seen.has(key)) seen.set(key, []);
    seen.get(key).push(entry);
  }
  return [...seen.values()].filter((group) => group.length > 1);
}

export function generateUniqueCards(bank, cellsPerCard, cardCount, options = {}) {
  const { random = Math.random, maxAttempts = cardCount * 500 } = options;

  if (cellsPerCard > bank.length) {
    const error = new RangeError(
      `Não é possível montar cartelas de ${cellsPerCard} respostas com um banco de apenas ${bank.length} pergunta(s).`
    );
    error.code = 'cells-exceed-bank';
    throw error;
  }

  const seenKeys = new Set();
  const cards = [];
  let attempts = 0;

  while (cards.length < cardCount) {
    if (attempts >= maxAttempts) {
      const error = new Error(
        `Não foi possível gerar ${cardCount} cartelas únicas com ${cellsPerCard} respostas cada a partir de ${bank.length} perguntas. Aumente o banco de perguntas ou reduza o número de cartelas.`
      );
      error.code = 'insufficient-combinations';
      throw error;
    }
    attempts++;

    const sampleIndexes = shuffle(
      Array.from({ length: bank.length }, (_, i) => i),
      random
    ).slice(0, cellsPerCard);

    const cardEntries = sampleIndexes.map((i) => ({ ...bank[i] }));
    const key = cardEntries
      .map((entry) => normalizeAnswer(entry.answer))
      .sort()
      .join(',');
    if (seenKeys.has(key)) continue;

    seenKeys.add(key);
    cards.push(shuffle(cardEntries, random));
  }

  return cards;
}

function normalizeAnswer(answer) {
  return String(answer).normalize('NFC').trim().replace(/\s+/g, ' ').toLowerCase();
}

function shuffle(array, random) {
  const copy = array.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
