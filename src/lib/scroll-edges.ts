/**
 * Marks a horizontally scrolling row with `data-more-start` / `data-more-end` while items hide past an edge,
 * so CSS can fade that edge and show there is more to swipe to. Written to the DOM: no re-render per scroll.
 */
export function markScrollEdges(row: HTMLElement) {
  row.toggleAttribute('data-more-start', row.scrollLeft > 1);
  row.toggleAttribute('data-more-end', row.scrollLeft + row.clientWidth < row.scrollWidth - 1);
}

/** Scrolls `item` into the row when it sits outside the visible part (phones: the active tab). */
export function revealInRow(row: HTMLElement, item: HTMLElement) {
  if (item.offsetLeft < row.scrollLeft || item.offsetLeft + item.offsetWidth > row.scrollLeft + row.clientWidth) {
    row.scrollLeft = item.offsetLeft - 24;
  }
}

/** Tailwind classes for the faded edges; pair with `markScrollEdges`. */
export const SCROLL_EDGE_FADE =
  'data-more-end:mask-r-from-[calc(100%-2rem)] data-more-start:mask-l-from-[calc(100%-2rem)]';
