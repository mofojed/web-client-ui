import React from 'react';
import { Layout, PlotData } from 'plotly.js';
import createPlotlyComponent from './plotly/createPlotlyComponent';
import Plotly from './plotly/Plotly';

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
