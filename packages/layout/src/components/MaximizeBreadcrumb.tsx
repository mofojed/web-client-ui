import type { CSSProperties } from 'react';
import { useMaximizeChain } from './MaximizeContext';

export interface MaximizeBreadcrumbProps {
  /** Optional className applied to the root element. */
  className?: string;
  /** Optional inline style for the root element. */
  style?: CSSProperties;
}

function HomeIcon(): JSX.Element {
  return (
    <svg
      className="dh-layout-breadcrumb-home-icon"
      viewBox="0 0 16 16"
      width="14"
      height="14"
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="currentColor"
        d="M8 1.5 1 7.2V8h1.5v6.5H7V10h2v4.5h4.5V8H15v-.8L8 1.5Z"
      />
    </svg>
  );
}

/**
 * Breadcrumb bar showing the currently maximized path across nested
 * dashboards, e.g. `Home > Dashboard 1 > Child Dashboard A`. Clicking Home or
 * any earlier crumb zooms back out to that level. Renders nothing when nothing
 * is maximized.
 *
 * Must be rendered inside a {@link MaximizeProvider} (alongside the dashboard
 * whose maximize state it reflects).
 */
export default function MaximizeBreadcrumb({
  className,
  style,
}: MaximizeBreadcrumbProps): JSX.Element | null {
  const { segments, zoomTo } = useMaximizeChain();

  if (segments.length === 0) return null;

  const classes = ['dh-layout-breadcrumb'];
  if (className != null && className !== '') classes.push(className);

  return (
    <nav
      className={classes.join(' ')}
      style={style}
      aria-label="Maximized path"
    >
      <button
        type="button"
        className="dh-layout-breadcrumb-item dh-layout-breadcrumb-home"
        onClick={() => zoomTo(-1)}
        aria-label="Home"
      >
        <HomeIcon />
      </button>
      {segments.map((segment, index) => {
        const isLast = index === segments.length - 1;
        return (
          <span
            // Crumbs are positional (there is no stable id), and the list is
            // short and re-rendered wholesale, so the index key is fine here.
            // eslint-disable-next-line react/no-array-index-key
            key={index}
            className="dh-layout-breadcrumb-segment"
          >
            <span className="dh-layout-breadcrumb-separator" aria-hidden="true">
              ›
            </span>
            {isLast ? (
              <span
                className="dh-layout-breadcrumb-item is-current"
                aria-current="page"
              >
                {segment.title}
              </span>
            ) : (
              <button
                type="button"
                className="dh-layout-breadcrumb-item"
                onClick={() => zoomTo(index)}
              >
                {segment.title}
              </button>
            )}
          </span>
        );
      })}
    </nav>
  );
}
