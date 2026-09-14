# Geração e Download de PDF do Bingo Didático — Implementation Plan (Plano 3 de 5)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tornar o gerador capaz de produzir e baixar um PDF completo e pronto
para impressão (cartelas, fichas de sorteio com/sem gabarito, folha
explicativa, marcadores e folha de rascunho), usando as medidas reais
extraídas do PDF de exemplo validado, com o tema visual escolhido pelo
professor.

**Architecture:** Dois novos módulos puros e testáveis (`src/questionBank.mjs`,
`src/pdfLayout.mjs`) somam-se ao motor já inlined no Artifact. A geração real
do PDF usa jsPDF (via CDN, camada fina não testável automaticamente,
verificada por revisão + inspeção do PDF gerado) desenhando exatamente as
posições calculadas por `pdfLayout.mjs`. Um teste de guarda
(`test/artifact.test.mjs`) confirma que o artifact publicado continua
inlinando fielmente o conteúdo atual de cada módulo-fonte, prevenindo
divergência silenciosa agora que o arquivo já passou por duas rodadas de
edição. Sem persistência nesta fase — banco de perguntas e imagem seguem
apenas na sessão do navegador (isso é o Plano 4).

**Tech Stack:** JavaScript puro (`.mjs`) testado com `node --test`, mesmo
padrão dos Planos 1-2. jsPDF 2.5.1 via `https://cdnjs.cloudflare.com` (único
CDN permitido para scripts pela ferramenta Artifact). Capacidade `downloads`
do Artifact para salvar o PDF gerado.

**Spec:** [docs/superpowers/specs/2026-09-10-gerador-bingo-didatico-design.md](../specs/2026-09-10-gerador-bingo-didatico-design.md)

## Medidas de referência (extraídas com pdfplumber de `BINGO PORCENTAGEM.pdf`)

Todas em pontos (pt), sistema de coordenadas com origem no canto superior
esquerdo da página, igual ao usado pelo jsPDF em modo `unit: 'pt'`.

- **Página**: 822 × 595.5 pt (paisagem).
- **Cartela**: caixa externa 392.3 × 442.9 pt; duas cartelas por página,
  margem esquerda 15.2 pt, margem superior 51.9 pt, vão de 3.4 pt entre as
  duas cartelas. Área de título: 75 pt de altura, começando 15.7 pt abaixo do
  topo da cartela. Grade quadrada de respostas: 319.2 × 319.2 pt, começando
  78.0 pt abaixo do topo da cartela e 36.6 pt à direita da borda esquerda da
  cartela (para o caso padrão de 9 respostas, grade 3×3, célula ≈106.4 pt).
- **Ficha de sorteio**: caixa externa 336.7 × 181.1 pt; 6 fichas por página
  (2 colunas × 3 linhas), margem esquerda 15.3 pt, margem superior 5.9 pt,
  vão horizontal 5.3 pt, vão vertical 6.9 pt. Área de conteúdo interna
  quadrada de 129.3 × 129.3 pt, centralizada na ficha.

Estas medidas fixam **dimensões e proporções** (conforme exigido pelo spec).
O estilo visual (cores, tipografia) usa o sistema já definido nos Planos 1-2
(tema escolhido pelo professor para a cartela; tipografia simples e legível
para fichas/folhas de apoio) em vez de tentar clonar os elementos
decorativos específicos do vendedor original do exemplo.

## Decisão de design tomada nesta sessão

O ícone/imagem de tema escolhido pelo professor é **decorativo, no
cabeçalho da cartela** (ao lado do título "Bingo de X"), e nunca ocupa uma
das respostas da grade. Isso mantém a cartela com o número real de respostas
declarado (`cellsPerCard`), igual ao exemplo validado, e não afeta a
matemática de duração do jogo. Isso corrige o comportamento atual do
protótipo do Plano 2, que fazia o ícone ocupar uma célula da grade.

## Global Constraints

- Nenhuma dependência de backend; nenhuma dependência npm de runtime para os
  módulos `.mjs` (continuam JS puro, testáveis com `node --test`).
- jsPDF é a única exceção de dependência externa, carregada via
  `https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js`,
  com uma tag `<script>` normal ANTES do `<script type="module">` que a usa
  (jsPDF não é um módulo ES — expõe `window.jspdf.jsPDF`).
- Geometria de página/cartela/ficha usa exatamente os valores da seção
  "Medidas de referência" acima — nunca aproximados ou arredondados de forma
  diferente do que está documentado ali.
- O ícone/imagem de tema é decorativo no cabeçalho da cartela — nunca ocupa
  uma célula da grade de respostas (ver "Decisão de design" acima).
- Sem persistência nesta fase: nenhuma capacidade `db` ou `assets` é
  declarada ou usada. Apenas `downloads`.
- Antes de publicar qualquer alteração no Artifact, carregar a skill
  `artifact-design`; antes de declarar ou usar a capacidade `downloads`,
  carregar a skill `artifact-capabilities` (ambas exigidas pela própria
  ferramenta Artifact).
- Qualquer HTML/CSS/JS novo ou alterado no artifact deve passar por uma
  revisão de design/UX (Task 6 deste plano) antes de considerar o plano
  concluído — não presumir que o código do plano em si já está correto só
  porque bate com o texto do plano (lição do Plano 2).

---

## Task 1: `src/questionBank.mjs` — extrair o parser do banco de perguntas

**Files:**
- Create: `src/questionBank.mjs`
- Test: `test/questionBank.test.mjs`

**Interfaces:**
- Produces: `parseQuestionBank(text: string): { entries: Array<{ question: string, answer: string }>, ignored: number }`

- [ ] **Step 1: Escrever os testes**

Criar `test/questionBank.test.mjs`:

```js
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
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `node --test test/questionBank.test.mjs`
Expected: FAIL — `src/questionBank.mjs` não existe ainda.

- [ ] **Step 3: Implementar `src/questionBank.mjs`**

```js
export function parseQuestionBank(text) {
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const entries = [];
  let ignored = 0;
  for (const line of lines) {
    const [question, answer] = line.split('|').map((part) => (part ?? '').trim());
    if (question && answer) {
      entries.push({ question, answer });
    } else {
      ignored++;
    }
  }
  return { entries, ignored };
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `node --test test/questionBank.test.mjs`
Expected: PASS (6 testes)

- [ ] **Step 5: Commit**

```bash
git add src/questionBank.mjs test/questionBank.test.mjs
git commit -m "feat: extract question bank parsing into its own tested module"
```

---

## Task 2: `src/pdfLayout.mjs` — geometria pura de página, cartela e ficha

**Files:**
- Create: `src/pdfLayout.mjs`
- Test: `test/pdfLayout.test.mjs`

**Interfaces:**
- Produces:
  - Constantes: `PAGE_WIDTH_PT`, `PAGE_HEIGHT_PT`, `CARD_WIDTH_PT`, `CARD_HEIGHT_PT`, `CARD_MARGIN_LEFT_PT`, `CARD_MARGIN_TOP_PT`, `CARD_GAP_PT`, `CARDS_PER_PAGE`, `CARD_TITLE_HEIGHT_PT`, `CARD_TITLE_MARGIN_TOP_PT`, `CARD_GRID_SIZE_PT`, `CARD_GRID_MARGIN_TOP_PT`, `CARD_GRID_MARGIN_LEFT_PT`, `TICKET_WIDTH_PT`, `TICKET_HEIGHT_PT`, `TICKET_MARGIN_LEFT_PT`, `TICKET_MARGIN_TOP_PT`, `TICKET_COL_GAP_PT`, `TICKET_ROW_GAP_PT`, `TICKETS_PER_ROW`, `TICKETS_PER_COL`, `TICKETS_PER_PAGE`, `TICKET_CONTENT_SIZE_PT`
  - `gridDimensions(cellsPerCard: number): { columns: number, rows: number }`
  - `cardPositionsForPage(): Array<{ x: number, y: number }>` (sempre 2 posições)
  - `cardSlot(index: number): { page: number, x: number, y: number }`
  - `cardCellRect(cellIndex: number, cellsPerCard: number): { x: number, y: number, width: number, height: number }`
  - `ticketPositionsForPage(): Array<{ x: number, y: number }>` (sempre 6 posições)
  - `ticketSlot(index: number): { page: number, x: number, y: number }`
  - `paginate(itemCount: number, itemsPerPage: number): number`

- [ ] **Step 1: Escrever os testes das constantes e de `gridDimensions`**

Criar `test/pdfLayout.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PAGE_WIDTH_PT,
  PAGE_HEIGHT_PT,
  CARD_WIDTH_PT,
  CARD_HEIGHT_PT,
  TICKET_WIDTH_PT,
  TICKET_HEIGHT_PT,
  gridDimensions,
} from '../src/pdfLayout.mjs';

test('page and card/ticket outer dimensions match the measured reference PDF', () => {
  assert.equal(PAGE_WIDTH_PT, 822);
  assert.equal(PAGE_HEIGHT_PT, 595.5);
  assert.equal(CARD_WIDTH_PT, 392.3);
  assert.equal(CARD_HEIGHT_PT, 442.9);
  assert.equal(TICKET_WIDTH_PT, 336.7);
  assert.equal(TICKET_HEIGHT_PT, 181.1);
});

test('gridDimensions(9) returns a 3x3 grid, matching the reference card', () => {
  assert.deepEqual(gridDimensions(9), { columns: 3, rows: 3 });
});

test('gridDimensions picks a near-square grid for other cell counts', () => {
  assert.deepEqual(gridDimensions(6), { columns: 3, rows: 2 });
  assert.deepEqual(gridDimensions(4), { columns: 2, rows: 2 });
  assert.deepEqual(gridDimensions(12), { columns: 4, rows: 3 });
  assert.deepEqual(gridDimensions(1), { columns: 1, rows: 1 });
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `node --test test/pdfLayout.test.mjs`
Expected: FAIL — `src/pdfLayout.mjs` não existe ainda.

- [ ] **Step 3: Implementar as constantes e `gridDimensions` em `src/pdfLayout.mjs`**

```js
export const PAGE_WIDTH_PT = 822;
export const PAGE_HEIGHT_PT = 595.5;

export const CARD_WIDTH_PT = 392.3;
export const CARD_HEIGHT_PT = 442.9;
export const CARD_MARGIN_LEFT_PT = 15.2;
export const CARD_MARGIN_TOP_PT = 51.9;
export const CARD_GAP_PT = 3.4;
export const CARDS_PER_PAGE = 2;

export const CARD_TITLE_HEIGHT_PT = 75;
export const CARD_TITLE_MARGIN_TOP_PT = 15.7;

export const CARD_GRID_SIZE_PT = 319.2;
export const CARD_GRID_MARGIN_TOP_PT = 78.0;
export const CARD_GRID_MARGIN_LEFT_PT = 36.6;

export const TICKET_WIDTH_PT = 336.7;
export const TICKET_HEIGHT_PT = 181.1;
export const TICKET_MARGIN_LEFT_PT = 15.3;
export const TICKET_MARGIN_TOP_PT = 5.9;
export const TICKET_COL_GAP_PT = 5.3;
export const TICKET_ROW_GAP_PT = 6.9;
export const TICKETS_PER_ROW = 2;
export const TICKETS_PER_COL = 3;
export const TICKETS_PER_PAGE = TICKETS_PER_ROW * TICKETS_PER_COL;

export const TICKET_CONTENT_SIZE_PT = 129.3;

export function gridDimensions(cellsPerCard) {
  const columns = Math.ceil(Math.sqrt(cellsPerCard));
  const rows = Math.ceil(cellsPerCard / columns);
  return { columns, rows };
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `node --test test/pdfLayout.test.mjs`
Expected: PASS (2 testes)

- [ ] **Step 5: Escrever os testes de posicionamento (cartelas)**

Adicionar a `test/pdfLayout.test.mjs`:

```js
import { cardPositionsForPage, cardSlot, cardCellRect, CARD_MARGIN_LEFT_PT, CARD_MARGIN_TOP_PT, CARD_GRID_MARGIN_LEFT_PT, CARD_GRID_MARGIN_TOP_PT, CARD_GRID_SIZE_PT } from '../src/pdfLayout.mjs';

test('cardPositionsForPage returns the two fixed card slots on a page', () => {
  const positions = cardPositionsForPage();
  assert.equal(positions.length, 2);
  assert.equal(positions[0].x, CARD_MARGIN_LEFT_PT);
  assert.equal(positions[0].y, CARD_MARGIN_TOP_PT);
  assert.ok(positions[1].x > positions[0].x);
  assert.equal(positions[1].y, CARD_MARGIN_TOP_PT);
});

test('cardSlot paginates two cards per page', () => {
  assert.equal(cardSlot(0).page, 0);
  assert.equal(cardSlot(1).page, 0);
  assert.equal(cardSlot(2).page, 1);
  assert.equal(cardSlot(3).page, 1);
  assert.equal(cardSlot(39).page, 19);
});

test('cardCellRect(0, 9) is the top-left cell of the 3x3 grid', () => {
  const rect = cardCellRect(0, 9);
  assert.equal(rect.x, CARD_GRID_MARGIN_LEFT_PT);
  assert.equal(rect.y, CARD_GRID_MARGIN_TOP_PT);
  assert.ok(Math.abs(rect.width - CARD_GRID_SIZE_PT / 3) < 0.001);
  assert.ok(Math.abs(rect.height - CARD_GRID_SIZE_PT / 3) < 0.001);
});

test('cardCellRect covers the full grid without gaps for a 3x3 card', () => {
  const rects = Array.from({ length: 9 }, (_, i) => cardCellRect(i, 9));
  const lastRect = rects[8];
  assert.ok(Math.abs((lastRect.x + lastRect.width) - (CARD_GRID_MARGIN_LEFT_PT + CARD_GRID_SIZE_PT)) < 0.001);
  assert.ok(Math.abs((lastRect.y + lastRect.height) - (CARD_GRID_MARGIN_TOP_PT + CARD_GRID_SIZE_PT)) < 0.001);
});
```

- [ ] **Step 6: Rodar e confirmar que falha**

Run: `node --test test/pdfLayout.test.mjs`
Expected: FAIL — `cardPositionsForPage`/`cardSlot`/`cardCellRect` não exportadas ainda.

- [ ] **Step 7: Implementar `cardPositionsForPage`, `cardSlot`, `cardCellRect`**

Adicionar a `src/pdfLayout.mjs`:

```js
export function cardPositionsForPage() {
  return [
    { x: CARD_MARGIN_LEFT_PT, y: CARD_MARGIN_TOP_PT },
    { x: CARD_MARGIN_LEFT_PT + CARD_WIDTH_PT + CARD_GAP_PT, y: CARD_MARGIN_TOP_PT },
  ];
}

export function cardSlot(index) {
  const page = Math.floor(index / CARDS_PER_PAGE);
  const slotOnPage = index % CARDS_PER_PAGE;
  const origin = cardPositionsForPage()[slotOnPage];
  return { page, x: origin.x, y: origin.y };
}

export function cardCellRect(cellIndex, cellsPerCard) {
  const { columns, rows } = gridDimensions(cellsPerCard);
  const cellWidth = CARD_GRID_SIZE_PT / columns;
  const cellHeight = CARD_GRID_SIZE_PT / rows;
  const col = cellIndex % columns;
  const row = Math.floor(cellIndex / columns);
  return {
    x: CARD_GRID_MARGIN_LEFT_PT + col * cellWidth,
    y: CARD_GRID_MARGIN_TOP_PT + row * cellHeight,
    width: cellWidth,
    height: cellHeight,
  };
}
```

- [ ] **Step 8: Rodar e confirmar que passa**

Run: `node --test test/pdfLayout.test.mjs`
Expected: PASS (6 testes)

- [ ] **Step 9: Escrever os testes de posicionamento (fichas) e `paginate`**

Adicionar a `test/pdfLayout.test.mjs`:

```js
import { ticketPositionsForPage, ticketSlot, paginate, TICKET_MARGIN_LEFT_PT, TICKET_MARGIN_TOP_PT, TICKETS_PER_PAGE } from '../src/pdfLayout.mjs';

test('ticketPositionsForPage returns 6 fixed slots (2 columns x 3 rows)', () => {
  const positions = ticketPositionsForPage();
  assert.equal(positions.length, 6);
  assert.equal(positions[0].x, TICKET_MARGIN_LEFT_PT);
  assert.equal(positions[0].y, TICKET_MARGIN_TOP_PT);
});

test('ticketSlot paginates six tickets per page', () => {
  assert.equal(ticketSlot(0).page, 0);
  assert.equal(ticketSlot(5).page, 0);
  assert.equal(ticketSlot(6).page, 1);
  assert.equal(ticketSlot(11).page, 1);
  assert.equal(ticketSlot(12).page, 2);
});

test('paginate rounds up to the next whole page', () => {
  assert.equal(paginate(40, 2), 20);
  assert.equal(paginate(41, 2), 21);
  assert.equal(paginate(12, TICKETS_PER_PAGE), 2);
  assert.equal(paginate(13, TICKETS_PER_PAGE), 3);
});
```

- [ ] **Step 10: Rodar e confirmar que falha**

Run: `node --test test/pdfLayout.test.mjs`
Expected: FAIL — `ticketPositionsForPage`/`ticketSlot`/`paginate` não exportadas ainda.

- [ ] **Step 11: Implementar `ticketPositionsForPage`, `ticketSlot`, `paginate`**

Adicionar a `src/pdfLayout.mjs`:

```js
export function ticketPositionsForPage() {
  const positions = [];
  for (let row = 0; row < TICKETS_PER_COL; row++) {
    for (let col = 0; col < TICKETS_PER_ROW; col++) {
      positions.push({
        x: TICKET_MARGIN_LEFT_PT + col * (TICKET_WIDTH_PT + TICKET_COL_GAP_PT),
        y: TICKET_MARGIN_TOP_PT + row * (TICKET_HEIGHT_PT + TICKET_ROW_GAP_PT),
      });
    }
  }
  return positions;
}

export function ticketSlot(index) {
  const page = Math.floor(index / TICKETS_PER_PAGE);
  const slotOnPage = index % TICKETS_PER_PAGE;
  const origin = ticketPositionsForPage()[slotOnPage];
  return { page, x: origin.x, y: origin.y };
}

export function paginate(itemCount, itemsPerPage) {
  return Math.ceil(itemCount / itemsPerPage);
}
```

- [ ] **Step 12: Rodar todos os testes do arquivo e confirmar que passam**

Run: `node --test test/pdfLayout.test.mjs`
Expected: PASS (12 testes)

- [ ] **Step 13: Commit**

```bash
git add src/pdfLayout.mjs test/pdfLayout.test.mjs
git commit -m "feat: add pure PDF layout geometry matching the measured reference PDF"
```

---

## Task 3: Estender `src/index.mjs` com `questionBank` e `pdfLayout`

**Files:**
- Modify: `src/index.mjs`
- Modify: `test/index.test.mjs`

**Interfaces:**
- Consumes: `parseQuestionBank` (Task 1); todas as exportações de `src/pdfLayout.mjs` (Task 2)
- Produces: `src/index.mjs` re-exportando também esses nomes

- [ ] **Step 1: Ler o `src/index.mjs` atual para confirmar seu conteúdo**

Deve conter exatamente:

```js
export {
  estimateSingleCardDraws,
  simulateGameLength,
  checkBankSizeRatio,
  DEFAULT_CELLS_PER_CARD,
  DEFAULT_CARD_COUNT,
} from './gameMath.mjs';
export { findDuplicateAnswers, generateUniqueCards } from './cardGenerator.mjs';
export { generateTickets } from './ticketGenerator.mjs';
export { PALETTE_PRESETS, isValidHexColor, resolveTheme, tintSvg } from './theme.mjs';
export { ICON_CATEGORIES } from './icons.mjs';
```

Se o conteúdo for diferente disso, PARE e reporte BLOCKED com o que encontrou.

- [ ] **Step 2: Escrever o teste dos novos exports**

Adicionar a `test/index.test.mjs`:

```js
test('index.mjs re-exports questionBank and pdfLayout', () => {
  assert.equal(typeof engine.parseQuestionBank, 'function');
  assert.equal(typeof engine.gridDimensions, 'function');
  assert.equal(typeof engine.cardSlot, 'function');
  assert.equal(typeof engine.cardCellRect, 'function');
  assert.equal(typeof engine.ticketSlot, 'function');
  assert.equal(typeof engine.paginate, 'function');
  assert.equal(typeof engine.PAGE_WIDTH_PT, 'number');
  assert.equal(typeof engine.CARD_WIDTH_PT, 'number');
});
```

- [ ] **Step 3: Rodar e confirmar que falha**

Run: `node --test test/index.test.mjs`
Expected: FAIL.

- [ ] **Step 4: Atualizar `src/index.mjs`**

Reescrever por completo:

```js
export {
  estimateSingleCardDraws,
  simulateGameLength,
  checkBankSizeRatio,
  DEFAULT_CELLS_PER_CARD,
  DEFAULT_CARD_COUNT,
} from './gameMath.mjs';
export { findDuplicateAnswers, generateUniqueCards } from './cardGenerator.mjs';
export { generateTickets } from './ticketGenerator.mjs';
export { PALETTE_PRESETS, isValidHexColor, resolveTheme, tintSvg } from './theme.mjs';
export { ICON_CATEGORIES } from './icons.mjs';
export { parseQuestionBank } from './questionBank.mjs';
export {
  PAGE_WIDTH_PT,
  PAGE_HEIGHT_PT,
  CARD_WIDTH_PT,
  CARD_HEIGHT_PT,
  CARD_MARGIN_LEFT_PT,
  CARD_MARGIN_TOP_PT,
  CARD_GAP_PT,
  CARDS_PER_PAGE,
  CARD_TITLE_HEIGHT_PT,
  CARD_TITLE_MARGIN_TOP_PT,
  CARD_GRID_SIZE_PT,
  CARD_GRID_MARGIN_TOP_PT,
  CARD_GRID_MARGIN_LEFT_PT,
  TICKET_WIDTH_PT,
  TICKET_HEIGHT_PT,
  TICKET_MARGIN_LEFT_PT,
  TICKET_MARGIN_TOP_PT,
  TICKET_COL_GAP_PT,
  TICKET_ROW_GAP_PT,
  TICKETS_PER_ROW,
  TICKETS_PER_COL,
  TICKETS_PER_PAGE,
  TICKET_CONTENT_SIZE_PT,
  gridDimensions,
  cardPositionsForPage,
  cardSlot,
  cardCellRect,
  ticketPositionsForPage,
  ticketSlot,
  paginate,
} from './pdfLayout.mjs';
```

- [ ] **Step 5: Rodar e confirmar que passa**

Run: `node --test test/index.test.mjs`
Expected: PASS

- [ ] **Step 6: Rodar a suíte completa**

Run: `node --test`
Expected: PASS (todos os testes anteriores + os novos, sem regressão)

- [ ] **Step 7: Commit**

```bash
git add src/index.mjs test/index.test.mjs
git commit -m "feat: re-export questionBank and pdfLayout from the engine entry point"
```

---

## Task 4: Atualizar o Artifact — geração real de PDF e download

**Files:**
- Modify: `artifact/bingo-gerador.html`

Antes de começar, carregue as skills `artifact-design` e `artifact-capabilities`
(exigidas pela ferramenta Artifact antes de publicar e antes de usar a
capacidade `downloads`, respectivamente).

**Interfaces:**
- Consumes: `parseQuestionBank`, todas as constantes/funções de `pdfLayout.mjs`
  (Tasks 1-2, inlined), além de todo o motor já inlined dos Planos 1-2.

- [ ] **Step 1: Ler o `artifact/bingo-gerador.html` atual por completo**

Você vai: (a) remover a cópia local de `parseQuestionBank` já inlined no
script (ela existe hoje dentro do bloco de wiring) e substituí-la pela
versão de `src/questionBank.mjs`; (b) inlinar `src/pdfLayout.mjs` também,
com `export` removido, junto aos outros módulos já inlined; (c) mudar o
posicionamento do ícone/imagem de tema (atualmente ocupa uma célula da
grade) para o cabeçalho da cartela; (d) adicionar a geração real de PDF e um
botão "Gerar bingo" com download via capacidade `downloads`.

- [ ] **Step 2: Adicionar a tag do jsPDF (script normal, ANTES do `<script type="module">`)**

Logo antes da tag `<script type="module">` existente, adicionar:

```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
```

- [ ] **Step 3: Remover a cópia local de `parseQuestionBank` e inlinar `pdfLayout.mjs`**

Dentro do `<script type="module">`, encontre a função `parseQuestionBank`
já existente (definida no bloco de wiring, depois do marcador
`// ===== FIM: motor inlined =====`) e REMOVA-A por completo — ela será
substituída pela cópia de `src/questionBank.mjs`, movida para DENTRO do
bloco de motor inlined (entre os marcadores `INÍCIO`/`FIM`), com `export`
removido:

```js
  // --- src/questionBank.mjs ---
  function parseQuestionBank(text) {
    const lines = text
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    const entries = [];
    let ignored = 0;
    for (const line of lines) {
      const [question, answer] = line.split('|').map((part) => (part ?? '').trim());
      if (question && answer) {
        entries.push({ question, answer });
      } else {
        ignored++;
      }
    }
    return { entries, ignored };
  }
```

Depois dela, inline o conteúdo completo de `src/pdfLayout.mjs` (todas as
constantes e as 7 funções), com `export` removido de cada declaração,
exatamente como foi feito para os outros módulos:

```js
  // --- src/pdfLayout.mjs ---
  const PAGE_WIDTH_PT = 822;
  const PAGE_HEIGHT_PT = 595.5;

  const CARD_WIDTH_PT = 392.3;
  const CARD_HEIGHT_PT = 442.9;
  const CARD_MARGIN_LEFT_PT = 15.2;
  const CARD_MARGIN_TOP_PT = 51.9;
  const CARD_GAP_PT = 3.4;
  const CARDS_PER_PAGE = 2;

  const CARD_TITLE_HEIGHT_PT = 75;
  const CARD_TITLE_MARGIN_TOP_PT = 15.7;

  const CARD_GRID_SIZE_PT = 319.2;
  const CARD_GRID_MARGIN_TOP_PT = 78.0;
  const CARD_GRID_MARGIN_LEFT_PT = 36.6;

  const TICKET_WIDTH_PT = 336.7;
  const TICKET_HEIGHT_PT = 181.1;
  const TICKET_MARGIN_LEFT_PT = 15.3;
  const TICKET_MARGIN_TOP_PT = 5.9;
  const TICKET_COL_GAP_PT = 5.3;
  const TICKET_ROW_GAP_PT = 6.9;
  const TICKETS_PER_ROW = 2;
  const TICKETS_PER_COL = 3;
  const TICKETS_PER_PAGE = TICKETS_PER_ROW * TICKETS_PER_COL;

  const TICKET_CONTENT_SIZE_PT = 129.3;

  function gridDimensions(cellsPerCard) {
    const columns = Math.ceil(Math.sqrt(cellsPerCard));
    const rows = Math.ceil(cellsPerCard / columns);
    return { columns, rows };
  }

  function cardPositionsForPage() {
    return [
      { x: CARD_MARGIN_LEFT_PT, y: CARD_MARGIN_TOP_PT },
      { x: CARD_MARGIN_LEFT_PT + CARD_WIDTH_PT + CARD_GAP_PT, y: CARD_MARGIN_TOP_PT },
    ];
  }

  function cardSlot(index) {
    const page = Math.floor(index / CARDS_PER_PAGE);
    const slotOnPage = index % CARDS_PER_PAGE;
    const origin = cardPositionsForPage()[slotOnPage];
    return { page, x: origin.x, y: origin.y };
  }

  function cardCellRect(cellIndex, cellsPerCard) {
    const { columns, rows } = gridDimensions(cellsPerCard);
    const cellWidth = CARD_GRID_SIZE_PT / columns;
    const cellHeight = CARD_GRID_SIZE_PT / rows;
    const col = cellIndex % columns;
    const row = Math.floor(cellIndex / columns);
    return {
      x: CARD_GRID_MARGIN_LEFT_PT + col * cellWidth,
      y: CARD_GRID_MARGIN_TOP_PT + row * cellHeight,
      width: cellWidth,
      height: cellHeight,
    };
  }

  function ticketPositionsForPage() {
    const positions = [];
    for (let row = 0; row < TICKETS_PER_COL; row++) {
      for (let col = 0; col < TICKETS_PER_ROW; col++) {
        positions.push({
          x: TICKET_MARGIN_LEFT_PT + col * (TICKET_WIDTH_PT + TICKET_COL_GAP_PT),
          y: TICKET_MARGIN_TOP_PT + row * (TICKET_HEIGHT_PT + TICKET_ROW_GAP_PT),
        });
      }
    }
    return positions;
  }

  function ticketSlot(index) {
    const page = Math.floor(index / TICKETS_PER_PAGE);
    const slotOnPage = index % TICKETS_PER_PAGE;
    const origin = ticketPositionsForPage()[slotOnPage];
    return { page, x: origin.x, y: origin.y };
  }

  function paginate(itemCount, itemsPerPage) {
    return Math.ceil(itemCount / itemsPerPage);
  }
```

- [ ] **Step 4: Corrigir todo call site que ainda usa a assinatura antiga de `parseQuestionBank`**

`updateCheap` já chama `parseQuestionBank(els.perguntas.value)` e
desestrutura `{ entries: bank, ignored }` — isso continua correto, já que a
versão movida tem exatamente a mesma assinatura. Nenhuma mudança adicional
é necessária nos call sites.

- [ ] **Step 5: Mover o ícone/imagem de tema para o cabeçalho da cartela (decorativo, não ocupa célula)**

No HTML, dentro de `<div class="cartela" id="cartela-preview">`, adicionar
um contêiner de ícone ao lado do título:

Encontre:
```html
    <div class="cartela" id="cartela-preview">
      <div class="cartela-titulo" id="cartela-titulo">Bingo</div>
    </div>
```

Substitua por:
```html
    <div class="cartela" id="cartela-preview">
      <div class="cartela-cabecalho">
        <span class="cartela-icone" id="cartela-icone"></span>
        <div class="cartela-titulo" id="cartela-titulo">Bingo</div>
      </div>
    </div>
```

No CSS, encontre a linha exata:
```css
  .cartela-titulo { grid-column: 1 / -1; font-size: 1.1rem; color: var(--tema-primaria, var(--carimbo)); margin-bottom: 0.4rem; }
```
E substitua por:
```css
  .cartela-cabecalho { grid-column: 1 / -1; display: flex; align-items: center; justify-content: center; gap: 0.5rem; margin-bottom: 0.4rem; }
  .cartela-titulo { font-size: 1.1rem; color: var(--tema-primaria, var(--carimbo)); }
  .cartela-icone { display: none; width: 1.6rem; height: 1.6rem; }
  .cartela-icone svg, .cartela-icone img { width: 100%; height: 100%; }
```
(A regra `.cartela-celula svg { width: 1.6rem; height: 1.6rem; }` logo abaixo
fica órfã — nada mais injeta um ícone dentro de `.cartela-celula` depois
desta mudança — mas não precisa removê-la agora; é inofensiva e pode ser
limpa numa passada futura se incomodar.)

Em `renderPreviewCard`, remova toda a lógica que injeta uma
`.cartela-celula` para o ícone/imagem e que faz `card.slice(0, cellsPerCard - 1)`
— a cartela agora sempre usa as `cellsPerCard` respostas completas. No lugar
disso, adicione uma função separada que atualiza o cabeçalho:

```js
  function renderCardHeaderIcon(theme) {
    const container = els.cartelaIcone;
    container.innerHTML = '';
    if (imagemPersonalizadaUrl) {
      const img = document.createElement('img');
      img.src = imagemPersonalizadaUrl;
      img.alt = '';
      container.appendChild(img);
      container.style.display = 'inline-block';
      return;
    }
    const iconeSelecionado = iconeSelecionadoId ? findIconById(iconeSelecionadoId) : null;
    if (iconeSelecionado) {
      const tintado = tintSvg(iconeSelecionado.svg, theme.primary);
      container.innerHTML = tintado;
      const svgEl = container.querySelector('svg');
      if (svgEl) svgEl.setAttribute('aria-hidden', 'true');
      container.style.display = 'inline-block';
      return;
    }
    container.style.display = 'none';
  }
```

Reescreva `renderPreviewCard` para não lidar mais com ícone/imagem:

```js
  function renderPreviewCard(bank, cellsPerCard) {
    els.cartelaPreview.querySelectorAll('.cartela-celula').forEach((cell) => cell.remove());
    if (bank.length === 0 || bank.length <= cellsPerCard) return;

    const card = getStablePreviewCard(bank, cellsPerCard);
    if (!card) return;

    for (const entry of card) {
      const celula = document.createElement('div');
      celula.className = 'cartela-celula';
      celula.textContent = entry.answer;
      els.cartelaPreview.appendChild(celula);
    }
  }
```

Em `updateCheap`, adicione `cartelaIcone: document.getElementById('cartela-icone')`
ao objeto `els`, e logo após a linha que chama `resolveTheme(...)`, adicione
a chamada `renderCardHeaderIcon(theme);`. Atualize a chamada existente para
`renderPreviewCard(bank, cellsPerCard, theme)` removendo o terceiro
argumento: `renderPreviewCard(bank, cellsPerCard);` (a função não usa mais
`theme` diretamente, já que o ícone agora é tratado por
`renderCardHeaderIcon`).

Como a imagem/ícone agora é sempre visível independente de `cellsPerCard`,
adicione uma chamada a `renderCardHeaderIcon` também no handler de
`els.imagem`'s `change` event, logo antes de `scheduleUpdate()` — na
prática, como `scheduleUpdate` já chama `updateCheap` que já chama
`renderCardHeaderIcon`, isso já acontece automaticamente; não precisa
duplicar a chamada.

- [ ] **Step 6: Remover a nota de "PDF chega em uma próxima etapa" e adicionar o botão de gerar**

Encontre:
```html
      <ul class="avisos" id="avisos" aria-live="polite"></ul>
      <p class="ajuda">Esta é uma prévia do formulário e do visual da cartela. A exportação em PDF chega em uma próxima etapa — por enquanto, use esta página para montar e conferir o tema do seu bingo.</p>
    </aside>
```

Substitua por:
```html
      <ul class="avisos" id="avisos" aria-live="polite"></ul>
      <button type="button" id="botao-gerar" class="botao-primario" disabled>Gerar bingo</button>
      <p class="ajuda">O PDF inclui cartelas, fichas de sorteio (com e sem gabarito), folha explicativa, marcadores e uma folha de rascunho.</p>
    </aside>
```

No CSS, adicione:
```css
  .botao-primario {
    display: block; width: 100%; margin-top: 0.75rem; padding: 0.7rem 1.2rem;
    background: var(--carimbo); color: var(--superficie); border: none;
    font-family: inherit; font-size: 0.95rem; cursor: pointer;
  }
  .botao-primario:disabled { opacity: 0.5; cursor: not-allowed; }
  .botao-primario:hover:not(:disabled) { background: color-mix(in srgb, var(--carimbo) 85%, black); }
```

- [ ] **Step 7: Implementar as funções de renderização do PDF**

Adicionar ao final do bloco de wiring (depois de todas as funções `render*`
já existentes, antes dos event listeners finais):

```js
  function hexToRgb(hex) {
    const value = hex.replace('#', '');
    return {
      r: parseInt(value.slice(0, 2), 16),
      g: parseInt(value.slice(2, 4), 16),
      b: parseInt(value.slice(4, 6), 16),
    };
  }

  function newPdfPage(doc) {
    doc.addPage([PAGE_WIDTH_PT, PAGE_HEIGHT_PT], 'landscape');
  }

  function renderExplicativaPdfPage(doc, tema) {
    doc.setFontSize(24);
    doc.setTextColor(30, 30, 30);
    doc.text(tema, PAGE_WIDTH_PT / 2, 60, { align: 'center' });
    doc.setFontSize(12);
    const linhas = [
      'Como jogar:',
      '1. Cada participante recebe uma cartela com respostas distribuidas aleatoriamente.',
      '2. O organizador sorteia uma ficha por vez e faz a leitura da pergunta.',
      '3. Os participantes verificam se a resposta esta na cartela e marcam.',
      '4. Vence quem completar a cartela primeiro.',
    ];
    linhas.forEach((linha, i) => {
      doc.text(linha, 60, 120 + i * 20);
    });
  }

  function renderCardPdf(doc, card, tema, theme, x, y) {
    const primary = hexToRgb(theme.primary);
    const background = hexToRgb(theme.background);
    const text = hexToRgb(theme.text);

    doc.setDrawColor(primary.r, primary.g, primary.b);
    doc.setFillColor(background.r, background.g, background.b);
    doc.rect(x, y, CARD_WIDTH_PT, CARD_HEIGHT_PT, 'FD');

    doc.setTextColor(primary.r, primary.g, primary.b);
    doc.setFontSize(20);
    doc.text(tema, x + CARD_WIDTH_PT / 2, y + CARD_TITLE_MARGIN_TOP_PT + CARD_TITLE_HEIGHT_PT / 2, {
      align: 'center',
      baseline: 'middle',
    });

    doc.setDrawColor(200, 200, 200);
    doc.setTextColor(text.r, text.g, text.b);
    doc.setFontSize(16);
    for (let i = 0; i < card.length; i++) {
      const cell = cardCellRect(i, card.length);
      doc.rect(x + cell.x, y + cell.y, cell.width, cell.height, 'S');
      doc.text(String(card[i].answer), x + cell.x + cell.width / 2, y + cell.y + cell.height / 2, {
        align: 'center',
        baseline: 'middle',
      });
    }
  }

  function renderTicketPdf(doc, entry, comGabarito, x, y) {
    doc.setDrawColor(150, 150, 150);
    doc.rect(x, y, TICKET_WIDTH_PT, TICKET_HEIGHT_PT, 'S');
    doc.setFontSize(14);
    doc.setTextColor(30, 30, 30);
    const texto = comGabarito ? `${entry.question} = ${entry.answer}` : entry.question;
    doc.text(texto, x + TICKET_WIDTH_PT / 2, y + TICKET_HEIGHT_PT / 2, {
      align: 'center',
      baseline: 'middle',
      maxWidth: TICKET_CONTENT_SIZE_PT,
    });
  }

  function renderMarcadoresPdfPage(doc, theme) {
    const primary = hexToRgb(theme.primary);
    doc.setFillColor(primary.r, primary.g, primary.b);
    const raio = 15;
    const colunas = 10;
    const linhas = 6;
    const espacamento = 60;
    const inicioX = 60;
    const inicioY = 60;
    for (let linha = 0; linha < linhas; linha++) {
      for (let coluna = 0; coluna < colunas; coluna++) {
        doc.circle(inicioX + coluna * espacamento, inicioY + linha * espacamento, raio, 'F');
      }
    }
  }

  function renderRascunhoPdfPage(doc) {
    doc.setFontSize(18);
    doc.setTextColor(30, 30, 30);
    doc.text('Folha de rascunho', PAGE_WIDTH_PT / 2, 50, { align: 'center' });
    doc.setDrawColor(200, 200, 200);
    const inicioY = 90;
    const fimX = PAGE_WIDTH_PT - 60;
    for (let i = 0; i < 15; i++) {
      const y = inicioY + i * 30;
      doc.line(60, y, fimX, y);
    }
  }

  function buildBingoPdf({ tema, cards, tickets, theme }) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: [PAGE_WIDTH_PT, PAGE_HEIGHT_PT] });

    renderExplicativaPdfPage(doc, tema);

    const cardSlots = cardPositionsForPage();
    cards.forEach((card, i) => {
      const slotOnPage = i % CARDS_PER_PAGE;
      if (slotOnPage === 0) newPdfPage(doc);
      renderCardPdf(doc, card, tema, theme, cardSlots[slotOnPage].x, cardSlots[slotOnPage].y);
    });

    const ticketSlots = ticketPositionsForPage();
    tickets.withAnswer.forEach((entry, i) => {
      const slotOnPage = i % TICKETS_PER_PAGE;
      if (slotOnPage === 0) newPdfPage(doc);
      renderTicketPdf(doc, entry, true, ticketSlots[slotOnPage].x, ticketSlots[slotOnPage].y);
    });

    tickets.withoutAnswer.forEach((entry, i) => {
      const slotOnPage = i % TICKETS_PER_PAGE;
      if (slotOnPage === 0) newPdfPage(doc);
      renderTicketPdf(doc, entry, false, ticketSlots[slotOnPage].x, ticketSlots[slotOnPage].y);
    });

    newPdfPage(doc);
    renderMarcadoresPdfPage(doc, theme);

    newPdfPage(doc);
    renderRascunhoPdfPage(doc);

    return doc;
  }
```

- [ ] **Step 8: Ligar o botão "Gerar bingo" à geração e ao download**

Adicionar `botaoGerar: document.getElementById('botao-gerar')` ao objeto
`els`. No final de `updateCheap`, antes do `return`, adicionar:

```js
    els.botaoGerar.disabled = hasDuplicates || bank.length === 0 || bank.length <= cellsPerCard;
```

Adicionar o listener do botão, junto aos outros event listeners no final do
script:

```js
  els.botaoGerar.addEventListener('click', async () => {
    const { bank, cellsPerCard, cardCount, hasDuplicates } = updateCheap();
    if (hasDuplicates || bank.length === 0 || bank.length <= cellsPerCard) return;

    els.botaoGerar.disabled = true;
    const textoOriginal = els.botaoGerar.textContent;
    els.botaoGerar.textContent = 'Gerando...';

    try {
      const theme = resolveTheme({ paletteId: paletaSelecionadaId, fontFamily: els.fonte.value });
      const cards = generateUniqueCards(bank, cellsPerCard, cardCount);
      const tickets = generateTickets(bank);
      const tema = els.tema.value.trim() || 'Bingo';
      const doc = buildBingoPdf({ tema, cards, tickets, theme });
      const blob = doc.output('blob');

      const downloads = await claude.use('downloads');
      if (downloads) {
        const nomeArquivo = tema.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'bingo';
        await downloads.save({ filename: `${nomeArquivo}.pdf`, data: blob });
      }
    } catch (error) {
      renderWarnings([{ level: 'error', message: `Não foi possível gerar o PDF: ${error.message}` }]);
    } finally {
      els.botaoGerar.disabled = hasDuplicates || bank.length === 0 || bank.length <= cellsPerCard;
      els.botaoGerar.textContent = textoOriginal;
    }
  });
```

- [ ] **Step 9: Validar sintaxe do script antes de publicar**

Extraia o conteúdo do `<script type="module">` e rode `node --check` nele
(mesmo procedimento dos planos anteriores — arquivo temporário se seu shell
não suportar `<()`). Expected: sem erros.

- [ ] **Step 10: Publicar via ferramenta Artifact**

Use o mesmo `file_path` (`artifact/bingo-gerador.html`) e a mesma `url` do
artifact já publicado (redeploy — não é um artifact novo). Desta vez,
declare `capabilities: {downloads: true}`. Não passe `favicon` novamente.

- [ ] **Step 11: Commit**

```bash
git add artifact/bingo-gerador.html
git commit -m "feat: generate and download a print-ready PDF (cards, tickets, sheets)"
```

---

## Task 5: Teste de guarda contra divergência do artifact

**Files:**
- Create: `test/artifact.test.mjs`

- [ ] **Step 1: Escrever e implementar o teste (sem TDD red/green — este teste só faz sentido depois que o artifact já existe e já inlina tudo)**

Criar `test/artifact.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const artifactPath = path.join(__dirname, '..', 'artifact', 'bingo-gerador.html');
const srcDir = path.join(__dirname, '..', 'src');

function normalizeLines(code) {
  return code
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('//'))
    .map((line) => line.replace(/^export\s+/, ''));
}

function extractInlinedScript(html) {
  const marker = '<script type="module">';
  const start = html.indexOf(marker);
  const end = html.indexOf('</script>', start);
  if (start === -1 || end === -1) {
    throw new Error('Could not find the inlined <script type="module"> block in the artifact');
  }
  return html.slice(start + marker.length, end);
}

test('the published artifact inlines the current content of every engine source file', () => {
  const html = readFileSync(artifactPath, 'utf8');
  const scriptLines = new Set(normalizeLines(extractInlinedScript(html)));

  const sourceFiles = [
    'gameMath.mjs',
    'cardGenerator.mjs',
    'ticketGenerator.mjs',
    'theme.mjs',
    'icons.mjs',
    'questionBank.mjs',
    'pdfLayout.mjs',
  ];

  for (const file of sourceFiles) {
    const sourceLines = normalizeLines(readFileSync(path.join(srcDir, file), 'utf8'));
    for (const line of sourceLines) {
      assert.ok(
        scriptLines.has(line),
        `artifact/bingo-gerador.html is missing a line from src/${file}: ${line}`
      );
    }
  }
});
```

- [ ] **Step 2: Rodar e confirmar que passa contra o artifact já atualizado na Task 4**

Run: `node --test test/artifact.test.mjs`
Expected: PASS. Se falhar, a Task 4 deixou o artifact fora de sincronia com
algum dos módulos-fonte — corrija o artifact (não este teste) antes de
prosseguir.

- [ ] **Step 3: Rodar a suíte completa**

Run: `node --test`
Expected: PASS (todos os testes, sem regressão)

- [ ] **Step 4: Commit**

```bash
git add test/artifact.test.mjs
git commit -m "test: guard against the artifact drifting from its inlined source modules"
```

---

## Task 6: Revisão de design/UX do botão e dos novos estados, publicação final

**Files:**
- Modify: `artifact/bingo-gerador.html` (conforme necessário)

- [ ] **Step 1: Ler o artifact publicado (ação `read` da ferramenta Artifact) e confirmar que bate com o arquivo local**

- [ ] **Step 2: Checklist de design**

- O botão "Gerar bingo" segue o mesmo sistema de tokens do resto do app
  (`--carimbo` como cor de ação primária) — nenhuma cor nova introduzida.
- O botão desabilitado (`disabled`) tem contraste reduzido mas ainda
  legível, e o cursor muda para indicar que está inativo.
- O texto do botão durante a geração ("Gerando...") e o estado de erro (via
  `renderWarnings`) usam a mesma linguagem/tom do resto da interface
  (frases diretas, sem jargão técnico).
- O ícone/imagem no cabeçalho da cartela não distorce o layout da grade
  (a grade de respostas deve manter sua altura de linha uniforme,
  independente de haver ou não ícone selecionado).
- Nenhuma seta decorativa, caixa alta ou sombra genérica foi introduzida.

- [ ] **Step 3: Checklist de acessibilidade e robustez**

- O botão tem um rótulo claro e muda de texto (não só visual) durante o
  estado de carregamento, para leitores de tela acompanharem.
- Erros de geração (`catch` no listener do botão) aparecem em `#avisos`,
  que já tem `aria-live="polite"` — confirme que isso é anunciado.
- O botão fica desabilitado corretamente nos três estados inválidos:
  banco vazio, banco pequeno demais, respostas duplicadas — teste os três
  manualmente alterando o campo de perguntas e observando o estado do
  botão.
- `doc.output('blob')` mais a chamada a `downloads.save` não travam a
  interface (o botão mostra "Gerando..." e volta ao normal mesmo se
  `claude.use('downloads')` resolver `null` — confirme que esse caminho
  não deixa o botão preso em "Gerando...").

- [ ] **Step 4: Gerar um PDF de teste manualmente e inspecionar**

Preencha o formulário com um banco de exemplo (pode reusar o banco do
`scripts/demo.mjs`: 12 perguntas de porcentagem, 9 respostas por cartela, 5
cartelas) diretamente na interface publicada, clique em "Gerar bingo", e
baixe o PDF resultante. Confirme visualmente: as cartelas têm 9 células
preenchidas e um cabeçalho com o título (e ícone, se selecionado); as
fichas com gabarito mostram pergunta e resposta; as fichas sem gabarito
mostram só a pergunta; a folha explicativa, os marcadores e a folha de
rascunho aparecem nas páginas finais; nenhum texto estoura as células.

- [ ] **Step 5: Corrigir o que os checklists ou a inspeção do PDF encontrarem**

Se algo falhar, corrija `artifact/bingo-gerador.html` e rode novamente o
teste de guarda (`node --test test/artifact.test.mjs`) antes de
republicar, já que uma correção pode reintroduzir divergência com os
módulos-fonte caso você edite só o artifact sem espelhar a mudança em
`src/`.

- [ ] **Step 6: Republicar e reportar**

Publique novamente via ferramenta Artifact (mesmo `file_path`, mesma
`url`, sem `favicon`). Reporte a URL final.

- [ ] **Step 7: Commit (se houve correções)**

```bash
git add artifact/bingo-gerador.html
git commit -m "polish: fix design/UX gaps found reviewing the PDF export flow"
```

Se nenhuma correção foi necessária, não crie um commit vazio.

---

## O que este plano NÃO cobre (fica para os Planos 4-5)

- Persistência: salvar/reabrir bancos de perguntas nomeados (capacidade
  `db`) e upload permanente de imagem (capacidade `assets`) — Plano 4.
- Moldes de caixa de sorteio/armazenamento e verso decorativo — Plano 5.

Este plano entrega, sozinho, a capacidade de gerar e baixar um PDF completo
e pronto para impressão a partir de qualquer banco de perguntas digitado na
sessão atual — o marco "consigo imprimir um bingo de verdade".
