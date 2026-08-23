import type GridMetrics from './GridMetrics';
import { type VisibleIndex } from './GridMetrics';
import type GridModel from './GridModel';
import type GridRenderer from './GridRenderer';

/**
 * Property on the grid canvas element where the accessibility API is attached.
 * Deliberately a string (rather than a symbol) so external tooling can reach it
 * from within a serialized browser evaluation.
 */
export const GRID_A11Y_KEY = '__dhGridA11y';

/** A rectangle relative to the top left of the grid canvas, in CSS pixels */
export type GridA11yRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

/**
 * API attached to the grid canvas element to expose the contents of the canvas
 * to accessibility and testing tooling.
 * All indexes are visible indexes (i.e. what the user sees on screen), and
 * anything not currently rendered in the viewport resolves to `null`.
 */
export interface GridA11yApi {
  /** The model currently backing the grid */
  readonly model: GridModel;

  /** The renderer currently drawing the grid */
  readonly renderer: GridRenderer;

  /** The metrics from the last render, or null if the grid has not rendered yet */
  readonly metrics: GridMetrics | null;

  /** Get the text rendered in a cell, or null if the cell is not in the viewport */
  getCellText(column: VisibleIndex, row: VisibleIndex): string | null;

  /** Get the bounds of a cell, or null if the cell is not in the viewport */
  getCellRect(column: VisibleIndex, row: VisibleIndex): GridA11yRect | null;

  /** Get the text of a bottom level column header, or null if not in the viewport */
  getColumnHeaderText(column: VisibleIndex): string | null;

  /** Get the bounds of a bottom level column header, or null if not in the viewport */
  getColumnHeaderRect(column: VisibleIndex): GridA11yRect | null;

  /** Get the visible index of the column with the given header text, or null if it is not in the viewport */
  getVisibleColumnByHeader(headerText: string): VisibleIndex | null;
}

/** A grid canvas element with the accessibility API attached */
export type GridA11yCanvas = HTMLCanvasElement & {
  [GRID_A11Y_KEY]?: GridA11yApi;
};

/**
 * Accessors for the live grid state. The grid provides getters rather than
 * values so the API always reflects the current model/renderer/metrics, even
 * after they are swapped at runtime.
 */
export type GridA11yHost = {
  getModel: () => GridModel;
  getRenderer: () => GridRenderer;
  getMetrics: () => GridMetrics | null;
};

/**
 * Create the accessibility API for a grid.
 * @param host Accessors for the live grid state
 * @returns The API to attach to the grid canvas
 */
export function createGridA11yApi(host: GridA11yHost): GridA11yApi {
  const { getModel, getRenderer, getMetrics } = host;

  function getModelColumn(
    metrics: GridMetrics,
    column: VisibleIndex
  ): number | null {
    return metrics.modelColumns.get(column) ?? null;
  }

  function getColumnHeaderText(column: VisibleIndex): string | null {
    const metrics = getMetrics();
    if (metrics == null) {
      return null;
    }
    const modelColumn = getModelColumn(metrics, column);
    if (modelColumn == null) {
      return null;
    }
    return getModel().textForColumnHeader(modelColumn, 0) ?? null;
  }

  return {
    get model() {
      return getModel();
    },

    get renderer() {
      return getRenderer();
    },

    get metrics() {
      return getMetrics();
    },

    getCellText(column, row) {
      const metrics = getMetrics();
      if (metrics == null) {
        return null;
      }
      const modelColumn = getModelColumn(metrics, column);
      const modelRow = metrics.modelRows.get(row);
      if (modelColumn == null || modelRow == null) {
        return null;
      }
      return getModel().textForCell(modelColumn, modelRow);
    },

    getCellRect(column, row) {
      const metrics = getMetrics();
      if (metrics == null) {
        return null;
      }
      const x = metrics.allColumnXs.get(column);
      const y = metrics.allRowYs.get(row);
      const width = metrics.allColumnWidths.get(column);
      const height = metrics.allRowHeights.get(row);
      if (x == null || y == null || width == null || height == null) {
        return null;
      }
      return {
        x: metrics.gridX + x,
        y: metrics.gridY + y,
        width,
        height,
      };
    },

    getColumnHeaderText,

    getColumnHeaderRect(column) {
      const metrics = getMetrics();
      if (metrics == null) {
        return null;
      }
      const x = metrics.allColumnXs.get(column);
      const width = metrics.allColumnWidths.get(column);
      if (x == null || width == null) {
        return null;
      }
      const { columnHeaderHeight } = metrics;
      return {
        x: metrics.gridX + x,
        // The bottom level header sits directly above the grid content
        y: metrics.gridY - columnHeaderHeight,
        width,
        height: columnHeaderHeight,
      };
    },

    getVisibleColumnByHeader(headerText) {
      const metrics = getMetrics();
      if (metrics == null) {
        return null;
      }
      return (
        metrics.allColumns.find(
          column => getColumnHeaderText(column) === headerText
        ) ?? null
      );
    },
  };
}
