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
