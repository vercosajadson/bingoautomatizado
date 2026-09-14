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
  cardPositionsForPage,
  cardSlot,
  cardCellRect,
  CARD_MARGIN_LEFT_PT,
  CARD_MARGIN_TOP_PT,
  CARD_GRID_MARGIN_LEFT_PT,
  CARD_GRID_MARGIN_TOP_PT,
  CARD_GRID_SIZE_PT,
  ticketPositionsForPage,
  ticketSlot,
  paginate,
  TICKET_MARGIN_LEFT_PT,
  TICKET_MARGIN_TOP_PT,
  TICKETS_PER_PAGE,
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
