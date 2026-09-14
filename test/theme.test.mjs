import test from 'node:test';
import assert from 'node:assert/strict';
import { PALETTE_PRESETS, isValidHexColor, resolveTheme, tintSvg } from '../src/theme.mjs';

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
