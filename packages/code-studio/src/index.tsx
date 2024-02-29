import Plotly from '@deephaven/chart';

const trace0 = {
  x: [1, 2, 3, 4],
  y: [10, 15, 13, 17],
  type: 'scattergl',

  // Drawing with mode=lines and type=scattergl does not work on M1 Macs
  mode: 'lines',
};

const trace1 = {
  x: [1, 2, 3, 4],
  y: [16, 5, 11, 9],
  type: 'scattergl',
};


const trace2 = {
  x: [1, 2, 3, 4],
  y: [9, 12, 6, 6],
  type: 'scattergl',

  // When specifying both lines and markers, only the markers are shown.
  mode: 'lines+markers',
};

const data: any = [trace0, trace1, trace2];

Plotly.newPlot('root', data);
