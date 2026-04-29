/**
 * Walk up from `focusedEl` toward `dashboardEl`, returning the panel id of
 * the closest enclosing `.dh-layout-panel-content` element. Returns null if
 *   - the walk doesn't reach `dashboardEl` (focus is outside this dashboard)
 *   - the walk crosses a nested `.dh-layout` before reaching `dashboardEl`
 *     (focus is inside a nested dashboard — that nested dashboard tracks its
 *     own focus separately, and a focus-within-nested-child shouldn't mark
 *     the outer host panel as focused)
 */
export default function findFocusedPanelId(
  focusedEl: Element,
  dashboardEl: HTMLElement
): string | null {
  let el: Element | null = focusedEl;
  let panelId: string | null = null;
  let crossedNested = false;
  while (el != null && el !== dashboardEl) {
    if (
      el !== focusedEl &&
      el instanceof HTMLElement &&
      el.classList.contains('dh-layout')
    ) {
      crossedNested = true;
    }
    if (
      panelId === null &&
      el instanceof HTMLElement &&
      el.classList.contains('dh-layout-panel-content') &&
      typeof el.dataset.panelId === 'string'
    ) {
      panelId = el.dataset.panelId;
    }
    el = el.parentElement;
  }
  if (el !== dashboardEl) return null;
  if (crossedNested) return null;
  return panelId;
}
