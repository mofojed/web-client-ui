/**
 * Colors and metrics shared by every renderer.
 *
 * The core deliberately does not read stylesheets so it stays framework free.
 * Use {@link createPlotThemeFromElement} to pick up Deephaven theme variables.
 */
export interface PlotTheme {
  /** Background of the whole plot, including the axis margins. */
  backgroundColor: string;
  /** Background of the data area only. */
  plotBackgroundColor: string;
  gridColor: string;
  axisColor: string;
  textColor: string;
  fontFamily: string;
  fontSize: number;
  /** Series colors, assigned by index when a series has no explicit color. */
  colorway: string[];
  /** Default line width in pixels for `line` series. */
  lineWidth: number;
  /** Default point diameter in pixels for `scatter` series. */
  pointSize: number;
  /** Space reserved outside the data area for axis labels. */
  margin: { top: number; right: number; bottom: number; left: number };
}

export const defaultPlotTheme: PlotTheme = {
  backgroundColor: '#1a171a',
  plotBackgroundColor: '#2d2a2e',
  gridColor: '#403e41',
  axisColor: '#5b5a5c',
  textColor: '#c0bfbf',
  fontFamily:
    "'Fira Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  fontSize: 11,
  colorway: [
    '#4878ea',
    '#fcd65b',
    '#3fde85',
    '#f0554d',
    '#a86ff5',
    '#3ccfd8',
    '#f57ec1',
    '#9ed85c',
  ],
  lineWidth: 1.5,
  pointSize: 5,
  margin: { top: 16, right: 16, bottom: 32, left: 56 },
};

const CSS_VARIABLE_MAP: Partial<Record<keyof PlotTheme, string>> = {
  backgroundColor: '--dh-color-bg',
  plotBackgroundColor: '--dh-color-surface-bg',
  gridColor: '--dh-color-border',
  axisColor: '--dh-color-fg-hover',
  textColor: '--dh-color-fg',
};

/**
 * Builds a theme from the Deephaven CSS custom properties in scope for
 * `element`, falling back to {@link defaultPlotTheme} for anything unset.
 */
export function createPlotThemeFromElement(
  element: Element,
  overrides: Partial<PlotTheme> = {}
): PlotTheme {
  const computed = getComputedStyle(element);
  const resolved: Partial<PlotTheme> = {};
  const keys = Object.keys(CSS_VARIABLE_MAP) as (keyof PlotTheme)[];
  for (let i = 0; i < keys.length; i += 1) {
    const key = keys[i];
    const variable = CSS_VARIABLE_MAP[key];
    if (variable != null) {
      const value = computed.getPropertyValue(variable).trim();
      if (value !== '') {
        (resolved as Record<string, string>)[key] = value;
      }
    }
  }
  return { ...defaultPlotTheme, ...resolved, ...overrides };
}

/** Returns the color to draw a series with, falling back to the theme colorway. */
export function getSeriesColor(
  theme: PlotTheme,
  index: number,
  color?: string
): string {
  if (color != null && color !== '') {
    return color;
  }
  return theme.colorway[index % theme.colorway.length];
}
