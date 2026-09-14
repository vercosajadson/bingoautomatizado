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
    .filter((line) => line.length > 0 && !line.startsWith('//') && !line.startsWith('/*') && !line.startsWith('*'))
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
