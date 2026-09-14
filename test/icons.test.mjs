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
