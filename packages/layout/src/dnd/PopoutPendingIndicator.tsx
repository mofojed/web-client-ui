/**
 * Rendered while the user is dragging a tab outside the browser viewport.
 * A fixed-position frame around the entire viewport with marching ants in
 * a distinct colour from the in-window drop indicators, plus a centred
 * "Release to pop out" label.
 *
 * Pointer events are disabled so the drag can pass through to the OS.
 */
export default function PopoutPendingIndicator(): JSX.Element {
  return (
    <div className="dh-layout-popout-pending" aria-hidden>
      <div className="dh-layout-popout-pending-label">Release to pop out</div>
    </div>
  );
}
