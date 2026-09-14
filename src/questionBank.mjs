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
