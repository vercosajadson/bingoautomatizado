# Motor de Geração do Bingo Didático — Implementation Plan (Plano 1 de 4)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir e testar, em JavaScript puro (sem UI, sem PDF), o motor que valida um banco de perguntas/respostas, estima a duração/competitividade do jogo, gera cartelas únicas e gera as fichas de sorteio (com e sem gabarito).

**Architecture:** Módulos ES (`.mjs`) sem dependências externas, testados com o test runner nativo do Node (`node --test`). Nenhuma dependência de DOM, backend ou biblioteca de terceiros — este motor será importado por planos futuros (UI/tema, renderização em PDF), tanto no Node quanto, mais tarde, inlined dentro de um Artifact HTML.

**Tech Stack:** Node.js (>=18) com módulos ES nativos (`.mjs`), `node:test` e `node:assert/strict` para testes. Nenhuma dependência de `package.json`/npm.

**Spec:** [docs/superpowers/specs/2026-09-10-gerador-bingo-didatico-design.md](../specs/2026-09-10-gerador-bingo-didatico-design.md)

## Global Constraints

- Todas as respostas do banco de perguntas devem ser únicas — validação obrigatória, não opcional (seção "Validações" do spec).
- Padrão de grade: 9 respostas por cartela (3×3); padrão de cartelas: 40 — ambos parametrizáveis, nunca hardcoded como únicos valores possíveis.
- Nenhuma dependência de backend: toda a lógica deste plano roda no cliente (o Node é usado apenas como ambiente de teste de desenvolvimento, não faz parte do artefato final publicado).
- Nenhuma dependência npm de runtime — apenas JavaScript puro e o test runner nativo do Node, para o código poder ser reaproveitado sem bundler dentro de um Artifact HTML nos planos seguintes.
- Módulos usam extensão `.mjs` e `export`/`import` nomeados (sem `export default`), para nomes de função explícitos em todo import.

---

## Task 1: `gameMath.mjs` — estimativa de duração e validação de proporção do banco

**Files:**
- Create: `src/gameMath.mjs`
- Test: `test/gameMath.test.mjs`

**Interfaces:**
- Produces:
  - `estimateSingleCardDraws(bankSize: number, cellsPerCard: number): number`
  - `simulateGameLength(bankSize: number, cellsPerCard: number, cardCount: number, options?: { trials?: number, random?: () => number }): { meanDraws: number, medianDraws: number, p10Draws: number, p90Draws: number, percentOfBankUsed: number }`
  - `checkBankSizeRatio(params: { bankSize: number, cellsPerCard: number, percentOfBankUsed?: number }): Array<{ level: 'ok' | 'warning' | 'error', code: string, message: string }>`

- [ ] **Step 1: Escrever o teste da fórmula analítica**

Criar `test/gameMath.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { estimateSingleCardDraws } from '../src/gameMath.mjs';

test('estimateSingleCardDraws matches analytic formula k*(N+1)/(k+1)', () => {
  // N=25, k=9 -> 9*26/10 = 23.4 (cenário do PDF de exemplo)
  assert.equal(estimateSingleCardDraws(25, 9), 23.4);
});

test('estimateSingleCardDraws rejects non-positive inputs', () => {
  assert.throws(() => estimateSingleCardDraws(0, 9), RangeError);
  assert.throws(() => estimateSingleCardDraws(25, 0), RangeError);
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `node --test test/gameMath.test.mjs`
Expected: FAIL — `src/gameMath.mjs` não existe ainda.

- [ ] **Step 3: Criar `src/gameMath.mjs` com a fórmula analítica**

```js
export function estimateSingleCardDraws(bankSize, cellsPerCard) {
  if (bankSize <= 0 || cellsPerCard <= 0) {
    throw new RangeError('bankSize and cellsPerCard must be positive');
  }
  return (cellsPerCard * (bankSize + 1)) / (cellsPerCard + 1);
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `node --test test/gameMath.test.mjs`
Expected: PASS (2 testes)

- [ ] **Step 5: Escrever os testes de `simulateGameLength`**

Adicionar ao topo de `test/gameMath.test.mjs` uma PRNG determinística (usada só nos testes) e os casos abaixo:

```js
import { simulateGameLength, checkBankSizeRatio } from '../src/gameMath.mjs';

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
```

- [ ] **Step 6: Rodar e confirmar que falha**

Run: `node --test test/gameMath.test.mjs`
Expected: FAIL — `simulateGameLength` não exportada ainda.

- [ ] **Step 7: Implementar `simulateGameLength` em `src/gameMath.mjs`**

Adicionar ao arquivo:

```js
export function simulateGameLength(bankSize, cellsPerCard, cardCount, options = {}) {
  const { trials = 400, random = Math.random } = options;
  if (cellsPerCard > bankSize) {
    throw new RangeError('cellsPerCard cannot exceed bankSize');
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
```

- [ ] **Step 8: Rodar e confirmar que passa**

Run: `node --test test/gameMath.test.mjs`
Expected: PASS (4 testes)

- [ ] **Step 9: Escrever os testes de `checkBankSizeRatio`**

Adicionar a `test/gameMath.test.mjs`:

```js
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
```

- [ ] **Step 10: Rodar e confirmar que falha**

Run: `node --test test/gameMath.test.mjs`
Expected: FAIL — `checkBankSizeRatio` não exportada ainda.

- [ ] **Step 11: Implementar `checkBankSizeRatio` em `src/gameMath.mjs`**

```js
export function checkBankSizeRatio({ bankSize, cellsPerCard, percentOfBankUsed }) {
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

  if (issues.length === 0) {
    issues.push({ level: 'ok', code: 'ok', message: 'Proporção de perguntas por cartela está balanceada.' });
  }

  return issues;
}
```

- [ ] **Step 12: Rodar todos os testes do arquivo e confirmar que passam**

Run: `node --test test/gameMath.test.mjs`
Expected: PASS (8 testes)

- [ ] **Step 13: Commit**

```bash
git add src/gameMath.mjs test/gameMath.test.mjs
git commit -m "feat: add game pacing estimation and bank-size validation"
```

---

## Task 2: `cardGenerator.mjs` — detecção de respostas duplicadas e geração de cartelas únicas

**Files:**
- Create: `src/cardGenerator.mjs`
- Test: `test/cardGenerator.test.mjs`

**Interfaces:**
- Consumes: nenhuma (módulo independente de `gameMath.mjs`)
- Produces:
  - `findDuplicateAnswers(bank: Array<{ question: string, answer: string }>): Array<Array<{ question: string, answer: string }>>`
  - `generateUniqueCards(bank: Array<{ question: string, answer: string }>, cardCount: number, cellsPerCard: number, options?: { random?: () => number, maxAttempts?: number }): Array<Array<{ question: string, answer: string }>>`

- [ ] **Step 1: Escrever os testes de `findDuplicateAnswers`**

Criar `test/cardGenerator.test.mjs`:

```js
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
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `node --test test/cardGenerator.test.mjs`
Expected: FAIL — `src/cardGenerator.mjs` não existe ainda.

- [ ] **Step 3: Implementar `findDuplicateAnswers`**

Criar `src/cardGenerator.mjs`:

```js
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
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `node --test test/cardGenerator.test.mjs`
Expected: PASS (2 testes)

- [ ] **Step 5: Escrever os testes de `generateUniqueCards`**

Adicionar a `test/cardGenerator.test.mjs`:

```js
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
```

- [ ] **Step 6: Rodar e confirmar que falha**

Run: `node --test test/cardGenerator.test.mjs`
Expected: FAIL — `generateUniqueCards` não exportada ainda.

- [ ] **Step 7: Implementar `generateUniqueCards`**

Adicionar a `src/cardGenerator.mjs`:

```js
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
```

- [ ] **Step 8: Rodar todos os testes do arquivo e confirmar que passam**

Run: `node --test test/cardGenerator.test.mjs`
Expected: PASS (6 testes)

- [ ] **Step 9: Commit**

```bash
git add src/cardGenerator.mjs test/cardGenerator.test.mjs
git commit -m "feat: add duplicate-answer detection and unique card generation"
```

---

## Task 3: `ticketGenerator.mjs` — fichas de sorteio com e sem gabarito

**Files:**
- Create: `src/ticketGenerator.mjs`
- Test: `test/ticketGenerator.test.mjs`

**Interfaces:**
- Consumes: nenhuma
- Produces:
  - `generateTickets(bank: Array<{ question: string, answer: string }>): { withAnswer: Array<{ question: string, answer: string }>, withoutAnswer: Array<{ question: string }> }`

- [ ] **Step 1: Escrever os testes**

Criar `test/ticketGenerator.test.mjs`:

```js
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
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `node --test test/ticketGenerator.test.mjs`
Expected: FAIL — `src/ticketGenerator.mjs` não existe ainda.

- [ ] **Step 3: Implementar `generateTickets`**

Criar `src/ticketGenerator.mjs`:

```js
export function generateTickets(bank) {
  const withAnswer = bank.map((entry) => ({ question: entry.question, answer: entry.answer }));
  const withoutAnswer = bank.map((entry) => ({ question: entry.question }));
  return { withAnswer, withoutAnswer };
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `node --test test/ticketGenerator.test.mjs`
Expected: PASS (3 testes)

- [ ] **Step 5: Commit**

```bash
git add src/ticketGenerator.mjs test/ticketGenerator.test.mjs
git commit -m "feat: add draw ticket generation (with and without answer key)"
```

---

## Task 4: `index.mjs` — ponto de entrada único + demo de integração

**Files:**
- Create: `src/index.mjs`
- Create: `scripts/demo.mjs`
- Test: `test/index.test.mjs`

**Interfaces:**
- Consumes: todas as funções produzidas nas Tasks 1–3 (exatas: `estimateSingleCardDraws`, `simulateGameLength`, `checkBankSizeRatio`, `findDuplicateAnswers`, `generateUniqueCards`, `generateTickets`)
- Produces: `src/index.mjs` re-exportando as seis funções acima — este é o único caminho de import que os Planos 2 e 3 (UI/tema e renderização em PDF) devem usar.

- [ ] **Step 1: Escrever o teste do barrel de exports**

Criar `test/index.test.mjs`:

```js
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
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `node --test test/index.test.mjs`
Expected: FAIL — `src/index.mjs` não existe ainda.

- [ ] **Step 3: Implementar `src/index.mjs`**

```js
export { estimateSingleCardDraws, simulateGameLength, checkBankSizeRatio } from './gameMath.mjs';
export { findDuplicateAnswers, generateUniqueCards } from './cardGenerator.mjs';
export { generateTickets } from './ticketGenerator.mjs';
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `node --test test/index.test.mjs`
Expected: PASS (1 teste)

- [ ] **Step 5: Escrever o script de demonstração/integração manual**

Criar `scripts/demo.mjs` (não é um teste automatizado — é uma verificação manual de que o pipeline completo funciona de ponta a ponta com um banco de exemplo):

```js
import {
  findDuplicateAnswers,
  generateUniqueCards,
  generateTickets,
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

const { percentOfBankUsed } = simulateGameLength(bank.length, cellsPerCard, cardCount, { trials: 300 });
const issues = checkBankSizeRatio({ bankSize: bank.length, cellsPerCard, percentOfBankUsed });

console.log(`Estimativa: usa ~${percentOfBankUsed.toFixed(0)}% do banco até o 1º vencedor`);
console.log('Avisos:', issues.map((i) => `[${i.level}] ${i.message}`).join(' | '));

const cards = generateUniqueCards(bank, cardCount, cellsPerCard);
console.log(`Geradas ${cards.length} cartelas de ${cellsPerCard} respostas.`);

const { withAnswer, withoutAnswer } = generateTickets(bank);
console.log(`Geradas ${withAnswer.length} fichas com gabarito e ${withoutAnswer.length} sem gabarito.`);
```

- [ ] **Step 6: Rodar o demo e confirmar a saída**

Run: `node scripts/demo.mjs`
Expected: nenhum erro; imprime a estimativa de uso do banco, os avisos (vazio/ok esperado com este banco balanceado), a contagem de 5 cartelas de 9 respostas e 12 fichas de cada tipo.

- [ ] **Step 7: Rodar a suíte de testes completa**

Run: `node --test test/`
Expected: PASS (todos os testes das Tasks 1–4, 18 no total)

- [ ] **Step 8: Commit**

```bash
git add src/index.mjs scripts/demo.mjs test/index.test.mjs
git commit -m "feat: add engine entry point and end-to-end demo script"
```

---

## O que este plano NÃO cobre (fica para os Planos 2–4)

- Formulário de entrada, seleção de tema/paleta/tipografia, biblioteca de ícones e upload de imagem (Plano 2).
- Extração das medidas exatas do `BINGO PORCENTAGEM.pdf`, renderização em PDF via jsPDF, e publicação como Artifact com as capacidades `downloads`, `db` e `assets` (Plano 3).
- Moldes de caixa de sorteio/armazenamento e verso decorativo com geometria idêntica ao exemplo (Plano 4).

Isso é intencional (ver decomposição em subsistemas no início desta sessão) — este plano entrega, sozinho, um motor de geração completo e testado, que os planos seguintes vão consumir via `src/index.mjs`.
