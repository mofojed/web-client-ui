import Plotly from '@deephaven/chart';

const trace1 = {
  x: [1, 2, 3, 4],
  y: [10, 15, 13, 17],
  type: 'scattergl',

  // Drawing with mode=lines and type=scattergl does not work on M1 Macs
  mode: 'lines',
};

const trace2 = {
  x: [1, 2, 3, 4],
  y: [16, 5, 11, 9],
  type: 'scattergl',
};

const data: any = [trace1, trace2];

Plotly.newPlot('root', data);
