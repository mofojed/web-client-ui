import type { Bounds, PlotShape } from '../model/PlotTypes';
import { formatTick, generateTicks } from '../scale/ticks';
import { getSeriesColor, type PlotTheme } from '../theme/PlotTheme';

export interface PlotArea {
  left: number;
  top: number;
  width: number;
  height: number;
}

const LEGEND_SWATCH_SIZE = 8;
const LEGEND_GAP = 16;

function clampTickCount(value: number): number {
  return Math.max(2, Math.min(10, Math.round(value)));
}

/**
 * Draws everything that is not series data: background, gridlines, axis ticks,
 * labels, and the legend.
 *
 * Shared by every renderer so the chrome looks identical no matter which one
 * draws the data.
 */
export class AxisPainter {
  private context: CanvasRenderingContext2D | null = null;

  constructor(private canvas: HTMLCanvasElement) {
    this.context = canvas.getContext('2d');
  }

  resize(width: number, height: number, devicePixelRatio: number): void {
    const { context } = this;
    if (context == null) {
      return;
    }
    this.canvas.width = Math.max(1, Math.round(width * devicePixelRatio));
    this.canvas.height = Math.max(1, Math.round(height * devicePixelRatio));
    context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  }

  paint(
    width: number,
    height: number,
    area: PlotArea,
    viewport: Bounds,
    shape: PlotShape,
    theme: PlotTheme
  ): void {
    const { context } = this;
    if (context == null) {
      return;
    }

    context.clearRect(0, 0, width, height);
    context.fillStyle = theme.backgroundColor;
    context.fillRect(0, 0, width, height);
    context.fillStyle = theme.plotBackgroundColor;
    context.fillRect(area.left, area.top, area.width, area.height);

    context.font = `${theme.fontSize}px ${theme.fontFamily}`;
    context.textBaseline = 'middle';

    // Tick density follows the plot area so labels do not collide when small
    const xTicks = generateTicks(
      viewport.xMin,
      viewport.xMax,
      clampTickCount(area.width / 90)
    );
    const yTicks = generateTicks(
      viewport.yMin,
      viewport.yMax,
      clampTickCount(area.height / 45)
    );
    const xStep = xTicks.length > 1 ? xTicks[1] - xTicks[0] : 1;
    const yStep = yTicks.length > 1 ? yTicks[1] - yTicks[0] : 1;
    const xSpan = viewport.xMax - viewport.xMin;
    const ySpan = viewport.yMax - viewport.yMin;

    context.strokeStyle = theme.gridColor;
    context.lineWidth = 1;
    context.beginPath();
    for (let i = 0; i < xTicks.length; i += 1) {
      const x =
        area.left +
        Math.round(((xTicks[i] - viewport.xMin) / xSpan) * area.width) +
        0.5;
      context.moveTo(x, area.top);
      context.lineTo(x, area.top + area.height);
    }
    for (let i = 0; i < yTicks.length; i += 1) {
      const y =
        area.top +
        Math.round(
          area.height - ((yTicks[i] - viewport.yMin) / ySpan) * area.height
        ) +
        0.5;
      context.moveTo(area.left, y);
      context.lineTo(area.left + area.width, y);
    }
    context.stroke();

    context.strokeStyle = theme.axisColor;
    context.beginPath();
    context.rect(
      area.left + 0.5,
      area.top + 0.5,
      area.width - 1,
      area.height - 1
    );
    context.stroke();

    context.fillStyle = theme.textColor;
    context.textAlign = 'center';
    for (let i = 0; i < xTicks.length; i += 1) {
      const x = area.left + ((xTicks[i] - viewport.xMin) / xSpan) * area.width;
      context.fillText(
        formatTick(xTicks[i], xStep),
        x,
        area.top + area.height + theme.fontSize
      );
    }

    context.textAlign = 'right';
    for (let i = 0; i < yTicks.length; i += 1) {
      const y =
        area.top +
        area.height -
        ((yTicks[i] - viewport.yMin) / ySpan) * area.height;
      context.fillText(formatTick(yTicks[i], yStep), area.left - 6, y);
    }

    this.paintLegend(area, shape, theme);
  }

  private paintLegend(
    area: PlotArea,
    shape: PlotShape,
    theme: PlotTheme
  ): void {
    const context = this.context as CanvasRenderingContext2D;
    if (shape.series.length === 0) {
      return;
    }
    context.textAlign = 'left';
    let x = area.left + 8;
    const y = area.top + 10;
    for (let i = 0; i < shape.series.length; i += 1) {
      const series = shape.series[i];
      context.fillStyle = getSeriesColor(theme, i, series.style?.color);
      context.fillRect(
        x,
        y - LEGEND_SWATCH_SIZE / 2,
        LEGEND_SWATCH_SIZE,
        LEGEND_SWATCH_SIZE
      );
      context.fillStyle = theme.textColor;
      const labelX = x + LEGEND_SWATCH_SIZE + 4;
      context.fillText(series.name, labelX, y);
      x = labelX + context.measureText(series.name).width + LEGEND_GAP;
    }
  }
}

export default AxisPainter;
