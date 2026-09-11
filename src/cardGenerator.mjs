export function findDuplicateAnswers(bank) {
  const seen = new Map();
  for (const entry of bank) {
    const key = normalizeAnswer(entry.answer);
    if (!seen.has(key)) seen.set(key, []);
    seen.get(key).push(entry);
  }
  return [...seen.values()].filter((group) => group.length > 1);
}

function normalizeAnswer(answer) {
  return String(answer).trim().toLowerCase();
}

export function generateUniqueCards(bank, cardCount, cellsPerCard, options = {}) {
  const { random = Math.random, maxAttempts = cardCount * 500 } = options;

  if (cellsPerCard > bank.length) {
    throw new RangeError(
      `Não é possível montar cartelas de ${cellsPerCard} respostas com um banco de apenas ${bank.length} pergunta(s).`
    );
  }

  const seenKeys = new Set();
  const cards = [];
  let attempts = 0;

  while (cards.length < cardCount) {
    if (attempts >= maxAttempts) {
      throw new Error(
        `Não foi possível gerar ${cardCount} cartelas únicas com ${cellsPerCard} respostas cada a partir de ${bank.length} perguntas. Aumente o banco de perguntas ou reduza o número de cartelas.`
      );
    }
    attempts++;

    const sampleIndexes = shuffle(
      Array.from({ length: bank.length }, (_, i) => i),
      random
    ).slice(0, cellsPerCard);
    const key = sampleIndexes.slice().sort((a, b) => a - b).join(',');
    if (seenKeys.has(key)) continue;

    seenKeys.add(key);
    const cardEntries = sampleIndexes.map((i) => bank[i]);
    cards.push(shuffle(cardEntries, random));
  }

  return cards;
}

function shuffle(array, random) {
  const copy = array.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
