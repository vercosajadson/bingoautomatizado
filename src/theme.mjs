export const PALETTE_PRESETS = [
  { id: 'classico', name: 'Clássico', primary: '#2F6F5E', accent: '#C98A1F', background: '#FFFFFF', text: '#1F2A24' },
  { id: 'alegre', name: 'Alegre', primary: '#D6486B', accent: '#3FA7A0', background: '#FFFFFF', text: '#241B2F' },
  { id: 'oceano', name: 'Oceano', primary: '#1D5C8A', accent: '#F2A65A', background: '#FFFFFF', text: '#132433' },
  { id: 'floresta', name: 'Floresta', primary: '#3B6B35', accent: '#E4B73B', background: '#FFFFFF', text: '#1B2A17' },
];

export function isValidHexColor(value) {
  return typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value);
}

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

export function tintSvg(svgMarkup, hexColor) {
  if (!isValidHexColor(hexColor)) {
    const error = new Error(`Cor inválida para tingir o ícone: "${hexColor}".`);
    error.code = 'invalid-color';
    throw error;
  }
  return svgMarkup.replace(/(fill|stroke)="#[0-9a-fA-F]{3,6}"/g, `$1="${hexColor}"`);
}
