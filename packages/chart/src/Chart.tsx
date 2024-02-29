import React from 'react';
import createPlotlyComponent from './plotly/createPlotlyComponent';
import Plotly from './plotly/Plotly';
import { Layout, PlotData } from 'plotly.js';

const PlotComponent = createPlotlyComponent(Plotly);

function Chart({
  data,
  layout,
}: {
  data: PlotData;
  layout: Layout;
}): JSX.Element {
  return (
    <PlotComponent
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      data={data}
      layout={layout}
      style={{ height: '100%', width: '100%' }}
    />
  );
}

export default Chart;
