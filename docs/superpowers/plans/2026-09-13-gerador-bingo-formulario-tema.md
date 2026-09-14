# Formulário e Tema Visual do Bingo Didático — Implementation Plan (Plano 2 de 4)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir o sistema de tema visual (paletas, tipografia, biblioteca de
ícones) e o formulário interativo com pré-visualização ao vivo da cartela,
publicado como um Artifact HTML autocontido que consome o motor do Plano 1.

**Architecture:** Duas novas bibliotecas puras (`src/theme.mjs`,
`src/icons.mjs`), testáveis no Node exatamente como as do Plano 1, mais um
único arquivo HTML/CSS/JS autocontido (`artifact/bingo-gerador.html`) que
inlina todo o motor (Plano 1 + Plano 2, sem `import`/`export` — tudo no mesmo
escopo de um `<script type="module">`) e implementa o formulário + preview.
Este arquivo ainda NÃO gera PDF nem usa as capacidades `downloads`/`db`/`assets`
do Artifact — isso é o Plano 3, que evolui o mesmo arquivo.

**Tech Stack:** JavaScript puro (`.mjs`) testado com `node --test`, mesmo
padrão do Plano 1. HTML/CSS/JS vanilla para o artifact (sem framework, sem
bundler). Fontes via Google Fonts (`fonts.googleapis.com`, permitido pela
ferramenta Artifact). Publicação via ferramenta Artifact.

**Spec:** [docs/superpowers/specs/2026-09-10-gerador-bingo-didatico-design.md](../specs/2026-09-10-gerador-bingo-didatico-design.md)
(ver especialmente a seção "Direção visual (definida para o Plano 2...)")

## Global Constraints

- A grade da cartela de preview aqui é apenas ilustrativa (CSS grid 3
  colunas) — não precisa bater com as medidas exatas do PDF de exemplo; isso
  é trabalho do Plano 3.
- Nenhuma dependência de backend; nenhuma dependência npm de runtime nova.
- O artifact final é um único arquivo autocontido: nenhum `import` de
  arquivo local é possível dentro dele — todo o motor (Plano 1 + Plano 2)
  deve ser inlined em um único `<script type="module">`, sem as palavras
  `export`/`import` entre as funções (elas passam a compartilhar o mesmo
  escopo).
- Paleta/tipografia do CHROME do próprio app são fixas (definidas abaixo);
  a paleta que o professor escolhe para o TEMA do bingo gerado é um dado de
  formulário independente — nunca confundir as duas.
- Cores do chrome (modo claro, tokens CSS em `:root`): `--papel:#F3EFE3`,
  `--superficie:#FFFFFF`, `--tinta:#1F2A24`, `--carimbo:#2F6F5E`,
  `--mostarda:#C98A1F`, `--caneta:#B23A2E`, `--linha:#DCD3BE`. Modo escuro
  (`prefers-color-scheme: dark` e `[data-theme="dark"]`):
  `--papel:#1B1F1C`, `--superficie:#242923`, `--tinta:#ECE7DB`,
  `--carimbo:#4FA88F`, `--mostarda:#E0A83F`, `--caneta:#E17B6C`,
  `--linha:#3A362C`.
- Tipografia do chrome: **Zilla Slab** (títulos, números de passo) + **Karla**
  (corpo, campos de formulário), via Google Fonts.
- Sem seta decorativa em botões, sem texto em caixa alta como rótulo, sem
  sombra genérica de card SaaS — bordas retas, fio fino de 1px.
- Publicação via ferramenta Artifact: arquivo sem tags
  `<!DOCTYPE>`/`<html>`/`<head>`/`<body>`, `<title>` no topo do arquivo,
  `favicon` obrigatório no primeiro publish (usar `🎓`).

---

## Task 1: `src/theme.mjs` — paletas, resolução de tema e tingimento de ícones

**Files:**
- Create: `src/theme.mjs`
- Test: `test/theme.test.mjs`

**Interfaces:**
- Produces:
  - `PALETTE_PRESETS: Array<{ id: string, name: string, primary: string, accent: string, background: string, text: string }>`
  - `isValidHexColor(value: string): boolean`
  - `resolveTheme(params: { paletteId?: string, customColors?: { primary?: string, accent?: string, background?: string, text?: string }, fontFamily?: string }): { primary: string, accent: string, background: string, text: string, fontFamily: string }`
  - `tintSvg(svgMarkup: string, hexColor: string): string`

- [ ] **Step 1: Escrever os testes de `isValidHexColor` e `PALETTE_PRESETS`**

Criar `test/theme.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { PALETTE_PRESETS, isValidHexColor } from '../src/theme.mjs';

test('PALETTE_PRESETS has at least 4 presets, each with the required fields', () => {
  assert.ok(PALETTE_PRESETS.length >= 4);
  for (const preset of PALETTE_PRESETS) {
    assert.equal(typeof preset.id, 'string');
    assert.equal(typeof preset.name, 'string');
    for (const field of ['primary', 'accent', 'background', 'text']) {
      assert.ok(isValidHexColor(preset[field]), `${preset.id}.${field} deve ser um hex válido`);
    }
  }
});

test('PALETTE_PRESETS has unique ids', () => {
  const ids = PALETTE_PRESETS.map((p) => p.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('isValidHexColor accepts 6-digit hex colors', () => {
  assert.equal(isValidHexColor('#2F6F5E'), true);
  assert.equal(isValidHexColor('#fff000'), true);
});

test('isValidHexColor rejects malformed values', () => {
  assert.equal(isValidHexColor('2F6F5E'), false);
  assert.equal(isValidHexColor('#FFF'), false);
  assert.equal(isValidHexColor('red'), false);
  assert.equal(isValidHexColor(''), false);
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `node --test test/theme.test.mjs`
Expected: FAIL — `src/theme.mjs` não existe ainda.

- [ ] **Step 3: Criar `src/theme.mjs` com `PALETTE_PRESETS` e `isValidHexColor`**

```js
export const PALETTE_PRESETS = [
  { id: 'classico', name: 'Clássico', primary: '#2F6F5E', accent: '#C98A1F', background: '#FFFFFF', text: '#1F2A24' },
  { id: 'alegre', name: 'Alegre', primary: '#D6486B', accent: '#3FA7A0', background: '#FFFFFF', text: '#241B2F' },
  { id: 'oceano', name: 'Oceano', primary: '#1D5C8A', accent: '#F2A65A', background: '#FFFFFF', text: '#132433' },
  { id: 'floresta', name: 'Floresta', primary: '#3B6B35', accent: '#E4B73B', background: '#FFFFFF', text: '#1B2A17' },
];

export function isValidHexColor(value) {
  return typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value);
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `node --test test/theme.test.mjs`
Expected: PASS (4 testes)

- [ ] **Step 5: Escrever os testes de `resolveTheme`**

Adicionar a `test/theme.test.mjs`:

```js
import { resolveTheme } from '../src/theme.mjs';

test('resolveTheme returns the first preset by default when no paletteId is given', () => {
  const theme = resolveTheme({});
  assert.equal(theme.primary, PALETTE_PRESETS[0].primary);
  assert.equal(theme.accent, PALETTE_PRESETS[0].accent);
});

test('resolveTheme resolves a specific paletteId', () => {
  const theme = resolveTheme({ paletteId: 'oceano' });
  const preset = PALETTE_PRESETS.find((p) => p.id === 'oceano');
  assert.equal(theme.primary, preset.primary);
});

test('resolveTheme falls back to the first preset for an unknown paletteId', () => {
  const theme = resolveTheme({ paletteId: 'nao-existe' });
  assert.equal(theme.primary, PALETTE_PRESETS[0].primary);
});

test('resolveTheme applies a valid custom color override', () => {
  const theme = resolveTheme({ paletteId: 'classico', customColors: { primary: '#123456' } });
  assert.equal(theme.primary, '#123456');
  assert.equal(theme.accent, PALETTE_PRESETS.find((p) => p.id === 'classico').accent);
});

test('resolveTheme throws a coded error on an invalid custom color', () => {
  try {
    resolveTheme({ paletteId: 'classico', customColors: { primary: 'not-a-color' } });
    assert.fail('expected a throw');
  } catch (error) {
    assert.equal(error.code, 'invalid-color');
  }
});

test('resolveTheme defaults fontFamily to Karla when not provided', () => {
  const theme = resolveTheme({});
  assert.equal(theme.fontFamily, 'Karla, sans-serif');
});

test('resolveTheme uses the provided fontFamily when given', () => {
  const theme = resolveTheme({ fontFamily: 'Zilla Slab, serif' });
  assert.equal(theme.fontFamily, 'Zilla Slab, serif');
});
```

- [ ] **Step 6: Rodar e confirmar que falha**

Run: `node --test test/theme.test.mjs`
Expected: FAIL — `resolveTheme` não exportada ainda.

- [ ] **Step 7: Implementar `resolveTheme`**

Adicionar a `src/theme.mjs`:

```js
export function resolveTheme({ paletteId, customColors = {}, fontFamily } = {}) {
  const preset = PALETTE_PRESETS.find((p) => p.id === paletteId) ?? PALETTE_PRESETS[0];
  const colors = {
    primary: preset.primary,
    accent: preset.accent,
    background: preset.background,
    text: preset.text,
  };

  for (const key of Object.keys(colors)) {
    const custom = customColors[key];
    if (custom === undefined) continue;
    if (!isValidHexColor(custom)) {
      const error = new Error(`Cor inválida para "${key}": "${custom}". Use um hexadecimal no formato #RRGGBB.`);
      error.code = 'invalid-color';
      throw error;
    }
    colors[key] = custom;
  }

  return {
    ...colors,
    fontFamily: fontFamily || 'Karla, sans-serif',
  };
}
```

- [ ] **Step 8: Rodar e confirmar que passa**

Run: `node --test test/theme.test.mjs`
Expected: PASS (11 testes)

- [ ] **Step 9: Escrever os testes de `tintSvg`**

Adicionar a `test/theme.test.mjs`:

```js
import { tintSvg } from '../src/theme.mjs';

test('tintSvg replaces fill color attributes with the given color', () => {
  const svg = '<svg><circle fill="#000000"/></svg>';
  assert.equal(tintSvg(svg, '#FF0000'), '<svg><circle fill="#FF0000"/></svg>');
});

test('tintSvg replaces stroke color attributes with the given color', () => {
  const svg = '<svg><path stroke="#000000" stroke-width="2"/></svg>';
  assert.equal(tintSvg(svg, '#00FF00'), '<svg><path stroke="#00FF00" stroke-width="2"/></svg>');
});

test('tintSvg replaces multiple fill/stroke occurrences', () => {
  const svg = '<svg><circle fill="#000000"/><path stroke="#000000"/></svg>';
  assert.equal(tintSvg(svg, '#123456'), '<svg><circle fill="#123456"/><path stroke="#123456"/></svg>');
});

test('tintSvg throws a coded error on an invalid target color', () => {
  try {
    tintSvg('<svg></svg>', 'not-a-color');
    assert.fail('expected a throw');
  } catch (error) {
    assert.equal(error.code, 'invalid-color');
  }
});
```

- [ ] **Step 10: Rodar e confirmar que falha**

Run: `node --test test/theme.test.mjs`
Expected: FAIL — `tintSvg` não exportada ainda.

- [ ] **Step 11: Implementar `tintSvg`**

Adicionar a `src/theme.mjs`:

```js
export function tintSvg(svgMarkup, hexColor) {
  if (!isValidHexColor(hexColor)) {
    const error = new Error(`Cor inválida para tingir o ícone: "${hexColor}".`);
    error.code = 'invalid-color';
    throw error;
  }
  return svgMarkup.replace(/(fill|stroke)="#[0-9a-fA-F]{3,6}"/g, `$1="${hexColor}"`);
}
```

- [ ] **Step 12: Rodar todos os testes do arquivo e confirmar que passam**

Run: `node --test test/theme.test.mjs`
Expected: PASS (15 testes)

- [ ] **Step 13: Commit**

```bash
git add src/theme.mjs test/theme.test.mjs
git commit -m "feat: add theme resolution (palettes, custom colors, icon tinting)"
```

---

## Task 2: `src/icons.mjs` — biblioteca de ícones por categoria

**Files:**
- Create: `src/icons.mjs`
- Test: `test/icons.test.mjs`

**Interfaces:**
- Produces: `ICON_CATEGORIES: Record<string, Array<{ id: string, label: string, svg: string }>>`

- [ ] **Step 1: Escrever os testes**

Criar `test/icons.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { ICON_CATEGORIES } from '../src/icons.mjs';

test('ICON_CATEGORIES has at least 4 categories, each with at least one icon', () => {
  const categoryNames = Object.keys(ICON_CATEGORIES);
  assert.ok(categoryNames.length >= 4);
  for (const name of categoryNames) {
    assert.ok(ICON_CATEGORIES[name].length >= 1, `categoria "${name}" está vazia`);
  }
});

test('every icon has a unique id across the whole library', () => {
  const ids = Object.values(ICON_CATEGORIES).flat().map((icon) => icon.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('every icon has a non-empty label and well-formed svg markup with a tintable color attribute', () => {
  for (const icon of Object.values(ICON_CATEGORIES).flat()) {
    assert.ok(icon.label.length > 0, `${icon.id} precisa de um label`);
    assert.match(icon.svg, /^<svg[\s>]/, `${icon.id}.svg deve começar com <svg`);
    assert.match(icon.svg, /<\/svg>$/, `${icon.id}.svg deve terminar com </svg>`);
    assert.match(
      icon.svg,
      /(fill|stroke)="#[0-9a-fA-F]{6}"/,
      `${icon.id}.svg precisa de pelo menos um fill/stroke hexadecimal tingível`
    );
  }
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `node --test test/icons.test.mjs`
Expected: FAIL — `src/icons.mjs` não existe ainda.

- [ ] **Step 3: Implementar `src/icons.mjs`**

```js
export const ICON_CATEGORIES = {
  matematica: [
    {
      id: 'matematica-percentual',
      label: 'Percentual',
      svg: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M6 18L18 6" stroke="#000000" stroke-width="2" stroke-linecap="round"/><circle cx="7" cy="7" r="2.5" fill="#000000"/><circle cx="17" cy="17" r="2.5" fill="#000000"/></svg>',
    },
    {
      id: 'matematica-soma',
      label: 'Soma',
      svg: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 4v16M4 12h16" stroke="#000000" stroke-width="2.5" stroke-linecap="round"/></svg>',
    },
  ],
  geografia: [
    {
      id: 'geografia-globo',
      label: 'Globo',
      svg: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="9" fill="none" stroke="#000000" stroke-width="2"/><ellipse cx="12" cy="12" rx="4" ry="9" fill="none" stroke="#000000" stroke-width="2"/><path d="M3 12h18" stroke="#000000" stroke-width="2"/></svg>',
    },
    {
      id: 'geografia-mapa',
      label: 'Mapa',
      svg: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M4 6l5-2 6 2 5-2v14l-5 2-6-2-5 2z" fill="none" stroke="#000000" stroke-width="2" stroke-linejoin="round"/></svg>',
    },
  ],
  ciencias: [
    {
      id: 'ciencias-frasco',
      label: 'Frasco',
      svg: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M10 3h4v6l5 9a2 2 0 01-1.8 3H6.8A2 2 0 015 18l5-9z" fill="none" stroke="#000000" stroke-width="2" stroke-linejoin="round"/></svg>',
    },
    {
      id: 'ciencias-folha',
      label: 'Folha',
      svg: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M4 20c8 0 16-8 16-16-8 0-16 8-16 16z" fill="#000000"/></svg>',
    },
  ],
  portugues: [
    {
      id: 'portugues-livro',
      label: 'Livro',
      svg: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M4 5h7v14H4zM13 5h7v14h-7z" fill="none" stroke="#000000" stroke-width="2" stroke-linejoin="round"/></svg>',
    },
    {
      id: 'portugues-fala',
      label: 'Balão de fala',
      svg: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M4 5h16v10H9l-4 4z" fill="none" stroke="#000000" stroke-width="2" stroke-linejoin="round"/></svg>',
    },
  ],
  historia: [
    {
      id: 'historia-coluna',
      label: 'Coluna',
      svg: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M4 20h16M6 20V9M10 20V9M14 20V9M18 20V9M4 9l8-5 8 5" fill="none" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    },
    {
      id: 'historia-pergaminho',
      label: 'Pergaminho',
      svg: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M6 4h12v16H6a2 2 0 010-4V6a2 2 0 000-2z" fill="none" stroke="#000000" stroke-width="2" stroke-linejoin="round"/></svg>',
    },
  ],
  geral: [
    {
      id: 'geral-estrela',
      label: 'Estrela',
      svg: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 3l2.6 5.9 6.4.6-4.8 4.3 1.4 6.3L12 17l-5.6 3.1 1.4-6.3-4.8-4.3 6.4-.6z" fill="#000000"/></svg>',
    },
    {
      id: 'geral-lampada',
      label: 'Lâmpada',
      svg: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M9 18h6M10 21h4M12 3a6 6 0 00-3 11.2V17h6v-2.8A6 6 0 0012 3z" fill="none" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    },
  ],
};
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `node --test test/icons.test.mjs`
Expected: PASS (3 testes)

- [ ] **Step 5: Commit**

```bash
git add src/icons.mjs test/icons.test.mjs
git commit -m "feat: add categorized icon library for the theme system"
```

---

## Task 3: Estender `src/index.mjs` com o tema e os ícones

**Files:**
- Modify: `src/index.mjs`
- Modify: `test/index.test.mjs`

**Interfaces:**
- Consumes: `PALETTE_PRESETS`, `isValidHexColor`, `resolveTheme`, `tintSvg` (Task 1); `ICON_CATEGORIES` (Task 2)
- Produces: `src/index.mjs` re-exportando também esses 5 nomes, além dos já existentes do Plano 1

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
```

Se o conteúdo for diferente disso, PARE e reporte BLOCKED com o que encontrou, em vez de prosseguir por cima de uma suposição errada.

- [ ] **Step 2: Escrever o teste dos novos exports**

Adicionar a `test/index.test.mjs` (não remova os testes existentes):

```js
test('index.mjs re-exports the theme and icon library', () => {
  assert.equal(typeof engine.isValidHexColor, 'function');
  assert.equal(typeof engine.resolveTheme, 'function');
  assert.equal(typeof engine.tintSvg, 'function');
  assert.ok(Array.isArray(engine.PALETTE_PRESETS));
  assert.equal(typeof engine.ICON_CATEGORIES, 'object');
});
```

- [ ] **Step 3: Rodar e confirmar que falha**

Run: `node --test test/index.test.mjs`
Expected: FAIL — os novos nomes não são exportados ainda.

- [ ] **Step 4: Atualizar `src/index.mjs`**

Reescrever o arquivo por completo:

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

- [ ] **Step 5: Rodar e confirmar que passa**

Run: `node --test test/index.test.mjs`
Expected: PASS

- [ ] **Step 6: Rodar a suíte completa**

Run: `node --test`
Expected: PASS (todos os testes anteriores + os novos, nenhuma regressão)

- [ ] **Step 7: Commit**

```bash
git add src/index.mjs test/index.test.mjs
git commit -m "feat: re-export theme and icon library from the engine entry point"
```

---

## Task 4: Montar e publicar o Artifact interativo (formulário + preview ao vivo)

**Files:**
- Create: `artifact/bingo-gerador.html`

**Interfaces:**
- Consumes: todo o motor do Plano 1 (`estimateSingleCardDraws`, `simulateGameLength`, `checkBankSizeRatio`, `findDuplicateAnswers`, `generateUniqueCards`, `generateTickets`, `DEFAULT_CELLS_PER_CARD`, `DEFAULT_CARD_COUNT`) e do Plano 2 (`PALETTE_PRESETS`, `resolveTheme`, `tintSvg`, `ICON_CATEGORIES`) — inlined, não importado.

Antes de começar, carregue a skill `artifact-design` (é exigido pela ferramenta Artifact antes de publicar qualquer artifact) e reconcilie rapidamente com a direção visual já definida no spec (seção "Direção visual") — elas devem ser compatíveis; se a skill sugerir algo que contradiga um token de cor/tipografia já definido no spec, o spec vence.

- [ ] **Step 1: Ler os 5 arquivos-fonte que serão inlined**

Leia o conteúdo atual de `src/gameMath.mjs`, `src/cardGenerator.mjs`,
`src/ticketGenerator.mjs`, `src/theme.mjs` e `src/icons.mjs`. Você vai copiar
o conteúdo de cada um para dentro do `<script type="module">` do artifact,
**removendo apenas as palavras `export` no início de cada declaração** (as
funções e constantes passam a viver no mesmo escopo do script, sem
`import`/`export` entre si).

**Atenção a uma duplicata deliberada:** `gameMath.mjs` e `cardGenerator.mjs`
cada um define sua própria função privada `shuffle(array, random)`,
byte-idênticas entre si (isso já foi avaliado e aceito no Plano 1, quando
eram módulos separados). Ao inlinar os dois no mesmo escopo, **inclua a
função `shuffle` uma única vez** (as duas cópias colidiriam como uma
redeclaração redundante na mesma função) — mantenha as demais funções
privadas de cada arquivo (`percentile`, `combinationsAtLeast`,
`normalizeAnswer`) normalmente, pois seus nomes não colidem.

- [ ] **Step 2: Criar `artifact/bingo-gerador.html` com o conteúdo completo abaixo**

```html
<title>Gerador de Bingo Didático</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Zilla+Slab:wght@400;600;700&family=Karla:wght@400;500;700&display=swap">
<style>
  :root {
    color-scheme: light;
    --papel: #F3EFE3;
    --superficie: #FFFFFF;
    --tinta: #1F2A24;
    --carimbo: #2F6F5E;
    --mostarda: #C98A1F;
    --caneta: #B23A2E;
    --linha: #DCD3BE;
  }
  @media (prefers-color-scheme: dark) {
    :root:not([data-theme="light"]) {
      --papel: #1B1F1C;
      --superficie: #242923;
      --tinta: #ECE7DB;
      --carimbo: #4FA88F;
      --mostarda: #E0A83F;
      --caneta: #E17B6C;
      --linha: #3A362C;
    }
  }
  :root[data-theme="dark"] {
    --papel: #1B1F1C;
    --superficie: #242923;
    --tinta: #ECE7DB;
    --carimbo: #4FA88F;
    --mostarda: #E0A83F;
    --caneta: #E17B6C;
    --linha: #3A362C;
  }
  * { box-sizing: border-box; }
  body { background: var(--papel); color: var(--tinta); font-family: 'Karla', Arial, sans-serif; margin: 0; }
  h1, h2, .passo-numero, .cartela-titulo { font-family: 'Zilla Slab', Georgia, serif; }
  .topo { padding: 1.5rem 2rem; border-bottom: 1px solid var(--linha); }
  .topo h1 { margin: 0; font-size: 1.5rem; font-weight: 600; }
  .layout { display: grid; grid-template-columns: 1.1fr 0.9fr; gap: 2rem; padding: 2rem; max-width: 1100px; margin: 0 auto; align-items: start; }
  @media (max-width: 860px) { .layout { grid-template-columns: 1fr; } }
  .passo { border: 1px solid var(--linha); padding: 1.25rem 1.5rem; margin-bottom: 1.25rem; background: var(--superficie); }
  .passo-cabecalho { display: flex; align-items: baseline; gap: 0.6rem; margin-bottom: 0.75rem; }
  .passo-numero { font-size: 1.1rem; color: var(--carimbo); }
  .passo h2 { margin: 0; font-size: 1.05rem; }
  label { display: block; font-size: 0.85rem; margin-bottom: 0.3rem; }
  input[type=text], input[type=number], textarea, select {
    width: 100%; padding: 0.5rem 0.6rem; border: 1px solid var(--linha);
    background: var(--superficie); font-family: inherit; font-size: 0.95rem; color: var(--tinta);
  }
  textarea { min-height: 8rem; resize: vertical; }
  .campo { margin-bottom: 0.9rem; }
  .ajuda { font-size: 0.78rem; opacity: 0.7; margin-top: 0.25rem; }
  .paletas { display: flex; gap: 0.6rem; flex-wrap: wrap; }
  .paleta-opcao { display: flex; flex-direction: column; align-items: center; gap: 0.3rem; cursor: pointer; border: 1px solid transparent; padding: 0.3rem; background: none; font-family: inherit; color: inherit; }
  .paleta-opcao.selecionada { border-color: var(--carimbo); }
  .paleta-swatch { width: 2.2rem; height: 2.2rem; border: 1px solid var(--linha); display: block; }
  .icones-grade { display: grid; grid-template-columns: repeat(auto-fill, minmax(2.6rem, 1fr)); gap: 0.5rem; margin-top: 0.5rem; }
  .icone-opcao { border: 1px solid var(--linha); background: var(--superficie); padding: 0.4rem; cursor: pointer; display: flex; align-items: center; justify-content: center; }
  .icone-opcao.selecionado { border-color: var(--carimbo); }
  .icone-opcao svg { width: 1.4rem; height: 1.4rem; }
  .previa { position: sticky; top: 1.5rem; border: 1px solid var(--linha); background: var(--superficie); padding: 1.5rem; }
  .cartela {
    display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.5rem;
    border: 2px solid var(--tema-primaria, var(--carimbo)); padding: 1rem; margin-bottom: 1rem;
    text-align: center; font-family: var(--tema-fonte, 'Karla'), sans-serif;
  }
  .cartela-titulo { grid-column: 1 / -1; font-size: 1.1rem; color: var(--tema-primaria, var(--carimbo)); margin-bottom: 0.4rem; }
  .cartela-celula { border: 1px solid var(--linha); padding: 0.75rem 0.3rem; font-size: 1.05rem; background: var(--tema-fundo, var(--superficie)); color: var(--tema-texto, var(--tinta)); }
  .estimativa { font-size: 0.9rem; margin-bottom: 0.75rem; }
  .estimativa strong { color: var(--carimbo); }
  .avisos { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.4rem; }
  .aviso { font-size: 0.85rem; padding: 0.5rem 0.7rem; border-left: 3px solid var(--caneta); background: color-mix(in srgb, var(--caneta) 12%, var(--superficie)); }
  .aviso.aviso-ok { border-left-color: var(--carimbo); background: color-mix(in srgb, var(--carimbo) 12%, var(--superficie)); }
  .imagem-preview { display: none; max-width: 4rem; margin-top: 0.5rem; border: 1px solid var(--linha); }
</style>

<header class="topo">
  <h1>Gerador de Bingo Didático</h1>
</header>

<main class="layout">
  <form class="formulario" id="formulario">
    <section class="passo">
      <div class="passo-cabecalho"><span class="passo-numero">1</span><h2>Tema</h2></div>
      <div class="campo">
        <label for="campo-tema">Nome do jogo</label>
        <input type="text" id="campo-tema" placeholder="Ex.: Bingo da Porcentagem">
      </div>
    </section>

    <section class="passo">
      <div class="passo-cabecalho"><span class="passo-numero">2</span><h2>Perguntas</h2></div>
      <div class="campo">
        <label for="campo-perguntas">Perguntas e respostas</label>
        <textarea id="campo-perguntas" placeholder="Uma por linha, no formato: pergunta | resposta&#10;Ex.: 10% de 20 | 2"></textarea>
        <p class="ajuda">Uma pergunta por linha, separando pergunta e resposta com "|". <span id="contagem-perguntas">0 perguntas</span></p>
      </div>
    </section>

    <section class="passo">
      <div class="passo-cabecalho"><span class="passo-numero">3</span><h2>Cartelas</h2></div>
      <div class="campo">
        <label for="campo-cartelas">Número de cartelas</label>
        <input type="number" id="campo-cartelas" min="1" value="40">
      </div>
      <div class="campo">
        <label for="campo-respostas-cartela">Respostas por cartela</label>
        <input type="number" id="campo-respostas-cartela" min="1" value="9">
      </div>
    </section>

    <section class="passo">
      <div class="passo-cabecalho"><span class="passo-numero">4</span><h2>Visual</h2></div>
      <div class="campo">
        <label>Paleta de cores</label>
        <div class="paletas" id="paletas"></div>
      </div>
      <div class="campo">
        <label for="campo-fonte">Tipografia da cartela</label>
        <select id="campo-fonte">
          <option value="Karla, Arial, sans-serif">Karla (sans)</option>
          <option value="Zilla Slab, Georgia, serif">Zilla Slab (serifada)</option>
        </select>
      </div>
      <div class="campo">
        <label>Ícone do tema</label>
        <div class="icones-grade" id="icones-grade"></div>
      </div>
      <div class="campo">
        <label for="campo-imagem">Ou envie sua própria imagem</label>
        <input type="file" id="campo-imagem" accept="image/*">
        <img class="imagem-preview" id="imagem-preview" alt="Pré-visualização da imagem enviada">
      </div>
    </section>
  </form>

  <aside class="previa" aria-live="polite">
    <div class="cartela" id="cartela-preview">
      <div class="cartela-titulo" id="cartela-titulo">Bingo</div>
    </div>
    <div class="estimativa" id="estimativa">Adicione perguntas para ver a estimativa de duração do jogo.</div>
    <ul class="avisos" id="avisos"></ul>
  </aside>
</main>

<script type="module">
  // ===== INÍCIO: motor inlined (Plano 1 + Plano 2) =====
  // Cole aqui o conteúdo de src/gameMath.mjs, src/cardGenerator.mjs (sem
  // repetir shuffle), src/ticketGenerator.mjs, src/theme.mjs e
  // src/icons.mjs, cada um com as palavras `export` removidas.
  // ===== FIM: motor inlined =====

  function parseQuestionBank(text) {
    return text
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => {
        const [question, answer] = line.split('|').map((part) => (part ?? '').trim());
        return { question: question ?? '', answer: answer ?? '' };
      })
      .filter((entry) => entry.question && entry.answer);
  }

  function debounce(fn, delay) {
    let handle;
    return (...args) => {
      clearTimeout(handle);
      handle = setTimeout(() => fn(...args), delay);
    };
  }

  const els = {
    tema: document.getElementById('campo-tema'),
    perguntas: document.getElementById('campo-perguntas'),
    contagem: document.getElementById('contagem-perguntas'),
    cartelas: document.getElementById('campo-cartelas'),
    respostasCartela: document.getElementById('campo-respostas-cartela'),
    fonte: document.getElementById('campo-fonte'),
    imagem: document.getElementById('campo-imagem'),
    imagemPreview: document.getElementById('imagem-preview'),
    paletas: document.getElementById('paletas'),
    iconesGrade: document.getElementById('icones-grade'),
    cartelaPreview: document.getElementById('cartela-preview'),
    cartelaTitulo: document.getElementById('cartela-titulo'),
    estimativa: document.getElementById('estimativa'),
    avisos: document.getElementById('avisos'),
  };

  let paletaSelecionadaId = PALETTE_PRESETS[0].id;
  let iconeSelecionadoId = null;
  let imagemPersonalizadaUrl = null;

  function renderPalettes() {
    els.paletas.innerHTML = '';
    for (const preset of PALETTE_PRESETS) {
      const opcao = document.createElement('button');
      opcao.type = 'button';
      opcao.className = 'paleta-opcao' + (preset.id === paletaSelecionadaId ? ' selecionada' : '');
      opcao.innerHTML = `<span class="paleta-swatch" style="background:${preset.primary}"></span><span>${preset.name}</span>`;
      opcao.addEventListener('click', () => {
        paletaSelecionadaId = preset.id;
        renderPalettes();
        scheduleUpdate();
      });
      els.paletas.appendChild(opcao);
    }
  }

  function findIconById(id) {
    for (const categoria of Object.values(ICON_CATEGORIES)) {
      const found = categoria.find((icone) => icone.id === id);
      if (found) return found;
    }
    return null;
  }

  function renderIcons() {
    els.iconesGrade.innerHTML = '';
    for (const categoria of Object.values(ICON_CATEGORIES)) {
      for (const icone of categoria) {
        const botao = document.createElement('button');
        botao.type = 'button';
        botao.className = 'icone-opcao' + (icone.id === iconeSelecionadoId ? ' selecionado' : '');
        botao.title = icone.label;
        botao.innerHTML = icone.svg;
        botao.addEventListener('click', () => {
          iconeSelecionadoId = iconeSelecionadoId === icone.id ? null : icone.id;
          renderIcons();
          scheduleUpdate();
        });
        els.iconesGrade.appendChild(botao);
      }
    }
  }

  function renderWarnings(issues) {
    els.avisos.innerHTML = '';
    for (const issue of issues) {
      const item = document.createElement('li');
      item.className = 'aviso' + (issue.level === 'ok' ? ' aviso-ok' : '');
      item.textContent = issue.message;
      els.avisos.appendChild(item);
    }
  }

  function renderPreviewCard(bank, cellsPerCard, theme) {
    els.cartelaPreview.querySelectorAll('.cartela-celula').forEach((cell) => cell.remove());
    if (bank.length === 0 || bank.length <= cellsPerCard) return;

    let card;
    try {
      card = generateUniqueCards(bank, cellsPerCard, 1)[0];
    } catch {
      return;
    }

    const iconeSelecionado = iconeSelecionadoId ? findIconById(iconeSelecionadoId) : null;
    if (iconeSelecionado && !imagemPersonalizadaUrl) {
      const tintado = tintSvg(iconeSelecionado.svg, theme.primary);
      const iconeCelula = document.createElement('div');
      iconeCelula.className = 'cartela-celula';
      iconeCelula.innerHTML = tintado;
      els.cartelaPreview.appendChild(iconeCelula);
      card = card.slice(0, cellsPerCard - 1);
    }

    for (const entry of card) {
      const celula = document.createElement('div');
      celula.className = 'cartela-celula';
      celula.textContent = entry.answer;
      els.cartelaPreview.appendChild(celula);
    }
  }

  function updateCheap() {
    const bank = parseQuestionBank(els.perguntas.value);
    els.contagem.textContent = `${bank.length} pergunta${bank.length === 1 ? '' : 's'}`;

    const cellsPerCard = Number(els.respostasCartela.value) || DEFAULT_CELLS_PER_CARD;
    const cardCount = Number(els.cartelas.value) || DEFAULT_CARD_COUNT;

    const theme = resolveTheme({ paletteId: paletaSelecionadaId, fontFamily: els.fonte.value });

    els.cartelaTitulo.textContent = els.tema.value.trim() || 'Bingo';
    els.cartelaPreview.style.setProperty('--tema-primaria', theme.primary);
    els.cartelaPreview.style.setProperty('--tema-fundo', theme.background);
    els.cartelaPreview.style.setProperty('--tema-texto', theme.text);
    els.cartelaPreview.style.setProperty('--tema-fonte', theme.fontFamily);

    const duplicates = findDuplicateAnswers(bank);
    let issues = [];
    if (duplicates.length > 0) {
      issues = duplicates.map((group) => ({
        level: 'error',
        message: `Respostas repetidas: ${group.map((entry) => `"${entry.answer}"`).join(', ')} — cada resposta precisa ser única.`,
      }));
    } else if (bank.length > 0) {
      issues = checkBankSizeRatio({ bankSize: bank.length, cellsPerCard, cardCount });
    }
    renderWarnings(issues);
    renderPreviewCard(bank, cellsPerCard, theme);

    return { bank, cellsPerCard, cardCount, hasDuplicates: duplicates.length > 0 };
  }

  const scheduleAccurateEstimate = debounce((bank, cellsPerCard, cardCount) => {
    if (bank.length <= cellsPerCard) return;
    const { percentOfBankUsed, meanDraws } = simulateGameLength(bank.length, cellsPerCard, cardCount, { trials: 200 });
    els.estimativa.innerHTML = `Com ${cardCount} cartelas em jogo: <strong>~${meanDraws.toFixed(0)} sorteios</strong> até o 1º vencedor, usando ~${percentOfBankUsed.toFixed(0)}% do banco.`;
    renderWarnings(checkBankSizeRatio({ bankSize: bank.length, cellsPerCard, cardCount, percentOfBankUsed }));
  }, 300);

  function scheduleUpdate() {
    const { bank, cellsPerCard, cardCount, hasDuplicates } = updateCheap();
    if (!hasDuplicates && bank.length > cellsPerCard) {
      scheduleAccurateEstimate(bank, cellsPerCard, cardCount);
    } else if (bank.length === 0) {
      els.estimativa.textContent = 'Adicione perguntas para ver a estimativa de duração do jogo.';
    }
  }

  els.imagem.addEventListener('change', () => {
    const file = els.imagem.files[0];
    imagemPersonalizadaUrl = file ? URL.createObjectURL(file) : null;
    if (imagemPersonalizadaUrl) {
      els.imagemPreview.src = imagemPersonalizadaUrl;
      els.imagemPreview.style.display = 'block';
    } else {
      els.imagemPreview.style.display = 'none';
    }
    scheduleUpdate();
  });

  for (const el of [els.tema, els.perguntas, els.cartelas, els.respostasCartela, els.fonte]) {
    el.addEventListener('input', scheduleUpdate);
  }

  renderPalettes();
  renderIcons();
  scheduleUpdate();
</script>
```

- [ ] **Step 3: Colar o motor inlined no lugar indicado**

Substitua o comentário `// Cole aqui o conteúdo...` pelo conteúdo real dos 5
arquivos-fonte (lidos no Step 1), com `export` removido de cada declaração e
com apenas UMA cópia de `shuffle`. Mantenha a ordem: gameMath, cardGenerator
(sem `shuffle` duplicado), ticketGenerator, theme, icons.

- [ ] **Step 4: Verificar sintaticamente antes de publicar**

Abra o arquivo com o Node apenas para validar que o bloco de script é JS
válido (sem publicar nada ainda):

Run: `node --check <(sed -n '/<script type="module">/,/<\/script>/p' artifact/bingo-gerador.html | sed '1d;$d')`

Se seu shell não suportar `<(...)`, extraia manualmente o conteúdo entre as
tags `<script type="module">` e `</script>` para um arquivo temporário
`/tmp/check.mjs` (ou equivalente) e rode `node --check /tmp/check.mjs`.
Expected: nenhuma saída (sintaxe válida). Se houver erro de sintaxe, corrija
o HTML antes de prosseguir.

- [ ] **Step 5: Publicar como Artifact**

Chame a ferramenta Artifact com `file_path` apontando para
`artifact/bingo-gerador.html`, `favicon: "🎓"`, e uma `description` curta
(ex.: "Formulário e prévia ao vivo do gerador de bingo didático — protótipo
do Plano 2, ainda sem exportação em PDF"). Não passe `capabilities` (nenhuma
capacidade de runtime é necessária neste plano). Anote a URL retornada.

- [ ] **Step 6: Commit**

```bash
git add artifact/bingo-gerador.html
git commit -m "feat: build interactive form + live card preview artifact"
```

---

## Task 5: Revisão de design e acessibilidade, publicação final

**Files:**
- Modify: `artifact/bingo-gerador.html` (conforme necessário)

- [ ] **Step 1: Ler o artifact publicado (ação `read` da ferramenta Artifact)**

Confirme que o HTML publicado é exatamente o que está em
`artifact/bingo-gerador.html` no repositório.

- [ ] **Step 2: Checklist de design (contra a seção "Direção visual" do spec)**

Verifique cada item e corrija o que não estiver de acordo:
- Nenhum botão tem seta decorativa (`→`) ou texto em caixa alta como rótulo.
- Cores do chrome do app usam exatamente os tokens `--papel`, `--superficie`,
  `--tinta`, `--carimbo`, `--mostarda`, `--caneta`, `--linha` — nenhuma cor
  hardcoded fora desses tokens (exceto dentro dos ícones SVG, que são
  tingidos dinamicamente, e da paleta que o professor escolhe para o TEMA do
  bingo, que é dado de formulário e não faz parte do chrome).
  do professor, tingidos dinamicamente).
- A paleta do app (chrome) e a paleta do tema do bingo (escolhida no
  formulário) permanecem visualmente distintas — a segunda só aparece dentro
  do elemento `.cartela`, nunca no restante da página.
- Bordas retas (nenhum `border-radius` além do que já é zero por padrão),
  fio fino de 1px, sem sombra de card genérica.
- O modo escuro (`prefers-color-scheme: dark`) não deixa nenhuma superfície
  branca "vazando" (todo `background` de `.passo`/`.previa`/inputs/ícones
  usa `var(--superficie)`, não uma cor fixa).

- [ ] **Step 3: Checklist de acessibilidade básica**

- Todo campo de formulário tem um `<label for="...">` correspondente.
- Nenhum CSS remove o outline de foco padrão do navegador (não deve haver
  `outline: none` em nenhum seletor).
- O container de avisos (`#avisos`) e a prévia (`.previa`) já têm
  `aria-live="polite"` no elemento pai — confirme que isso está presente e
  funcionando (avisos são anunciados quando aparecem).
- Contraste de texto: `--tinta` sobre `--papel`/`--superficie` e `--carimbo`
  sobre `--superficie`, tanto no modo claro quanto no escuro, devem ser
  visivelmente legíveis (inspeção visual — ambos os pares são
  deliberadamente escuro-sobre-claro ou claro-sobre-escuro de alto
  contraste, não pastel-sobre-pastel).

- [ ] **Step 4: Corrigir o que a revisão encontrar**

Se qualquer item do Step 2 ou 3 falhar, corrija `artifact/bingo-gerador.html`
diretamente e re-publique (mesmo `file_path`, mesma URL — não passe
`favicon` de novo).

- [ ] **Step 5: Republicar e reportar**

Publique novamente via ferramenta Artifact (mesmo arquivo) para garantir que
a versão ao vivo reflete todas as correções. Reporte a URL final.

- [ ] **Step 6: Commit (se houve correções no Step 4)**

```bash
git add artifact/bingo-gerador.html
git commit -m "polish: fix design/accessibility gaps found in review pass"
```

Se nenhuma correção foi necessária, não crie um commit vazio — apenas
reporte que a checklist passou de primeira.

---

## O que este plano NÃO cobre (fica para os Planos 3-4)

- Geração real de PDF (cartelas, fichas, folha explicativa) via jsPDF.
- Extração das medidas exatas do `BINGO PORCENTAGEM.pdf`.
- Publicação com as capacidades `downloads`, `db` (salvar bancos de
  perguntas) e `assets` (upload persistente de imagem) — o upload de imagem
  deste plano é só uma pré-visualização local via `URL.createObjectURL`, que
  não sobrevive a um reload nem é salva em lugar nenhum.
- Moldes de caixa e verso decorativo (Plano 4).

Este plano entrega um protótipo interativo completo do formulário e do
sistema de tema, verificável visualmente na URL do Artifact, mas sem a
capacidade de gerar o material final para impressão — isso é o Plano 3.
