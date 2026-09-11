/**
 * Fast analytic estimate (no simulation) of the expected draw count for a
 * single card to complete, using k*(N+1)/(k+1). Cheap enough to call on
 * every keystroke in a live UI. Use simulateGameLength when you need the
 * more accurate multi-card race estimate (meanDraws/percentOfBankUsed) —
 * it costs 30-100ms+ per call and should be debounced in a UI.
 */
export function estimateSingleCardDraws(bankSize, cellsPerCard) {
  if (bankSize <= 0 || cellsPerCard <= 0) {
    const error = new RangeError('bankSize and cellsPerCard must be positive');
    error.code = 'invalid-arguments';
    throw error;
  }
  return (cellsPerCard * (bankSize + 1)) / (cellsPerCard + 1);
}

export const DEFAULT_CELLS_PER_CARD = 9;
export const DEFAULT_CARD_COUNT = 40;

export function simulateGameLength(bankSize, cellsPerCard, cardCount, options = {}) {
  const { trials = 400, random = Math.random } = options;
  if (cellsPerCard > bankSize) {
    const error = new RangeError('cellsPerCard cannot exceed bankSize');
    error.code = 'cells-exceed-bank-size';
    throw error;
  }
  if (trials <= 0) {
    const error = new RangeError('trials must be a positive number');
    error.code = 'invalid-trials';
    throw error;
  }

  const pool = Array.from({ length: bankSize }, (_, i) => i);
  const gameLengths = [];

  for (let t = 0; t < trials; t++) {
    const drawOrder = shuffle(pool, random);
    const position = new Map();
    drawOrder.forEach((item, idx) => position.set(item, idx));

    const seenCards = new Set();
    const cards = [];
    let attempts = 0;
    while (cards.length < cardCount && attempts < cardCount * 200) {
      attempts++;
      const card = shuffle(pool, random).slice(0, cellsPerCard);
      const key = card.slice().sort((a, b) => a - b).join(',');
      if (!seenCards.has(key)) {
        seenCards.add(key);
        cards.push(card);
      }
    }

    const completions = cards.map(
      (card) => Math.max(...card.map((item) => position.get(item))) + 1
    );
    gameLengths.push(Math.min(...completions));
  }

  gameLengths.sort((a, b) => a - b);
  const n = gameLengths.length;
  const meanDraws = gameLengths.reduce((sum, v) => sum + v, 0) / n;
  const percentOfBankUsed = (meanDraws / bankSize) * 100;

  return {
    meanDraws,
    medianDraws: percentile(gameLengths, 0.5),
    p10Draws: percentile(gameLengths, 0.1),
    p90Draws: percentile(gameLengths, 0.9),
    percentOfBankUsed,
  };
}

export function checkBankSizeRatio({ bankSize, cellsPerCard, cardCount, percentOfBankUsed }) {
  const issues = [];

  if (bankSize <= cellsPerCard) {
    issues.push({
      level: 'error',
      code: 'bank-too-small',
      message: `O banco tem ${bankSize} pergunta(s), mas cada cartela precisa de ${cellsPerCard} respostas. Adicione mais perguntas ou reduza respostas por cartela.`,
    });
    return issues;
  }

  if (bankSize < 1.5 * cellsPerCard) {
    issues.push({
      level: 'warning',
      code: 'bank-small',
      message: `Com apenas ${bankSize} perguntas para ${cellsPerCard} respostas por cartela, o jogo tende a ficar curto e pouco competitivo. Considere adicionar mais perguntas.`,
    });
  }

  if (typeof percentOfBankUsed === 'number' && percentOfBankUsed < 40) {
    issues.push({
      level: 'warning',
      code: 'bank-large',
      message: `Em média, apenas ${percentOfBankUsed.toFixed(0)}% do banco será sorteado antes de alguém vencer. Boa parte das perguntas pode nunca ser usada nesta partida.`,
    });
  }

  if (typeof cardCount === 'number' && !combinationsAtLeast(bankSize, cellsPerCard, cardCount * 10)) {
    issues.push({
      level: 'warning',
      code: 'combinations-tight',
      message: `Com ${bankSize} perguntas e ${cellsPerCard} respostas por cartela, há poucas combinações possíveis para ${cardCount} cartelas únicas. Considere adicionar mais perguntas ou reduzir o número de cartelas.`,
    });
  }

  if (issues.length === 0) {
    issues.push({ level: 'ok', code: 'ok', message: 'Proporção de perguntas por cartela está balanceada.' });
  }

  return issues;
}

function shuffle(array, random) {
  const copy = array.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function percentile(sortedArray, p) {
  const idx = Math.min(sortedArray.length - 1, Math.floor(p * sortedArray.length));
  return sortedArray[idx];
}

// Returns true if C(n, k) >= threshold, computed incrementally to avoid
// integer overflow on large n/k (we only ever need to know if it clears
// the threshold, not its exact value).
function combinationsAtLeast(n, k, threshold) {
  if (k < 0 || k > n) return false;
  if (k === 0 || k === n) return threshold <= 1;
  let result = 1;
  for (let i = 0; i < k; i++) {
    result = (result * (n - i)) / (i + 1);
    if (result >= threshold) return true;
  }
  return result >= threshold;
}
