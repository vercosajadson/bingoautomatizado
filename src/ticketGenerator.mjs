export function generateTickets(bank) {
  const withAnswer = bank.map((entry) => ({ question: entry.question, answer: entry.answer }));
  const withoutAnswer = bank.map((entry) => ({ question: entry.question }));
  return { withAnswer, withoutAnswer };
}
