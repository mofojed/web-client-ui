import React from 'react';
import { Chart } from '@deephaven/chart';

const data: any = [
  {
    // Doesn't display anything with scattergl on M1 Mac
    type: 'scattergl',
    // Works fine with scatter type
    // type: 'scatter',
    mode: 'lines',
    name: 'Test',
    orientation: 'v',
    showlegend: true,
    x: [
      0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
      21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38,
      39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56,
      57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74,
      75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92,
      93, 94, 95, 96, 97, 98, 99,
    ],
    xaxis: 'x',
    y: [
      0, 0.8414709848078965, 0.9092974268256817, 0.1411200080598672,
      -0.7568024953079282, -0.9589242746631385, -0.27941549819892586,
      0.6569865987187891, 0.9893582466233818, 0.4121184852417566,
      -0.5440211108893698, -0.9999902065507035, -0.5365729180004349,
      0.4201670368266409, 0.9906073556948704, 0.6502878401571168,
      -0.2879033166650653, -0.9613974918795568, -0.7509872467716762,
      0.14987720966295234, 0.9129452507276277, 0.8366556385360561,
      -0.008851309290403876, -0.8462204041751706, -0.9055783620066238,
      -0.13235175009777303, 0.7625584504796028, 0.956375928404503,
      0.27090578830786904, -0.6636338842129675, -0.9880316240928618,
      -0.404037645323065, 0.5514266812416906, 0.9999118601072672,
      0.5290826861200238, -0.428182669496151, -0.9917788534431158,
      -0.6435381333569995, 0.2963685787093853, 0.9637953862840878,
      0.7451131604793488, -0.158622668804709, -0.9165215479156338,
      -0.8317747426285983, 0.017701925105413577, 0.8509035245341184,
      0.9017883476488092, 0.123573122745224, -0.7682546613236668,
      -0.9537526527594719, -0.26237485370392877, 0.6702291758433747,
      0.9866275920404853, 0.39592515018183416, -0.5587890488516163,
      -0.9997551733586199, -0.5215510020869119, 0.43616475524782494,
      0.9928726480845371, 0.6367380071391379, -0.3048106211022167,
      -0.9661177700083929, -0.7391806966492229, 0.16735570030280691,
      0.9200260381967906, 0.8268286794901034, -0.026551154023966794,
      -0.8555199789753223, -0.8979276806892913, -0.11478481378318722,
      0.7738906815578891, 0.9510546532543747, 0.25382336276203626,
      -0.6767719568873076, -0.9851462604682474, -0.38778163540943045,
      0.5661076368981803, 0.9995201585807313, 0.5139784559875352,
      -0.4441126687075084, -0.9938886539233752, -0.6298879942744539,
      0.31322878243308516, 0.9683644611001854, 0.7331903200732922,
      -0.1760756199485871, -0.9234584470040598, -0.8218178366308225,
      0.03539830273366068, 0.8600694058124532, 0.8939966636005579,
      0.10598751175115685, -0.7794660696158047, -0.9482821412699473,
      -0.24525198546765434, 0.683261714736121, 0.9835877454343449,
      0.3796077390275217, -0.5733818719904229, -0.9992068341863537,
    ],
    yaxis: 'y',
    marker: {
      color: '',
    },
    line: {
      width: 1,
      color: '',
    },
    visible: true,
  },
];

const layout: any = {
  datarevision: 1,
  grid: {
    rows: 1,
    columns: 1,
    pattern: 'independent',
  },
  margin: {
    t: 30,
  },
  title: {
    text: '',
    pad: {
      t: 8,
    },
  },
  showlegend: false,
  yaxis: {
    title: {
      text: '',
    },
    side: 'left',
    domain: [0, 1],
    tickformat: null,
    ticksuffix: null,
    range: [-1.1110958769205908, 1.1110175304771543],
    autorange: true,
    type: 'linear',
  },
  xaxis: {
    title: {
      text: '',
    },
    side: 'bottom',
    domain: [0, 1],
    tickformat: null,
    ticksuffix: null,
    range: [0, 99],
    autorange: true,
    type: 'linear',
  },
  template: {
    data: {
      bar: [
        {
          marker: {
            line: {
              color: 'transparent',
            },
          },
        },
      ],
      scatter: [
        {
          error_x: {
            color: '#dcfbc2',
          },
          error_y: {
            color: '#dcfbc2',
          },
        },
      ],
      ohlc: [
        {
          increasing: {
            line: {
              color: '#9bd96c',
            },
          },
          decreasing: {
            line: {
              color: '#f85e85',
            },
          },
        },
      ],
      pie: [
        {
          outsidetextfont: {
            color: '#f0f0ee',
          },
        },
      ],
      treemap: [
        {
          outsidetextfont: {
            color: '#f0f0ee',
          },
        },
      ],
    },
    layout: {
      paper_bgcolor: '#2d2a2e',
      plot_bgcolor: '#322f33',
      autosize: true,
      colorway: [
        '#74d6e1ff',
        '#9bd96cff',
        '#fad459ff',
        '#cac1feff',
        '#fa8648ff',
        '#f85e85ff',
        '#c2d153ff',
        '#c592e5ff',
        '#5edeb8ff',
        '#ee83baff',
        '#f0f0eeff',
      ],
      font: {
        family: "'Fira Sans', sans-serif",
        color: '#f0f0ee',
      },
      title: {
        font: {
          color: '#f0f0ee',
        },
        xanchor: 'center',
        xref: 'paper',
        yanchor: 'top',
        pad: {
          t: 8,
        },
        y: 1,
      },
      legend: {
        font: {
          color: '#f0f0ee',
        },
      },
      margin: {
        l: 60,
        r: 50,
        t: 30,
        b: 60,
        pad: 0,
      },
      xaxis: {
        automargin: true,
        gridcolor: '#403e41',
        linecolor: '#5b5a5c',
        rangeslider: {
          visible: false,
        },
        showline: true,
        ticks: 'outside',
        ticklen: 5,
        tickcolor: '#2d2a2e',
        tickfont: {
          color: '#c0bfbf',
        },
        title: {
          font: {
            color: '#f0f0ee',
          },
        },
        legend: {
          font: {
            color: '#f0f0ee',
          },
        },
        showgrid: true,
      },
      yaxis: {
        automargin: true,
        gridcolor: '#403e41',
        linecolor: '#5b5a5c',
        rangeslider: {
          visible: false,
        },
        showline: true,
        ticks: 'outside',
        ticklen: 5,
        tickcolor: '#2d2a2e',
        tickfont: {
          color: '#c0bfbf',
        },
        title: {
          font: {
            color: '#f0f0ee',
          },
        },
        legend: {
          font: {
            color: '#f0f0ee',
          },
        },
        zerolinecolor: '#c0bfbf',
        zerolinewidth: 2,
      },
      polar: {
        angularaxis: {
          automargin: true,
          gridcolor: '#403e41',
          linecolor: '#5b5a5c',
          rangeslider: {
            visible: false,
          },
          showline: true,
          ticks: 'outside',
          ticklen: 5,
          tickcolor: '#2d2a2e',
          tickfont: {
            color: '#c0bfbf',
          },
          title: {
            font: {
              color: '#f0f0ee',
            },
          },
          legend: {
            font: {
              color: '#f0f0ee',
            },
          },
        },
        radialaxis: {
          automargin: true,
          gridcolor: '#403e41',
          linecolor: '#5b5a5c',
          rangeslider: {
            visible: false,
          },
          showline: true,
          ticks: 'outside',
          ticklen: 5,
          tickcolor: '#2d2a2e',
          tickfont: {
            color: '#c0bfbf',
          },
          title: {
            font: {
              color: '#f0f0ee',
            },
          },
          legend: {
            font: {
              color: '#f0f0ee',
            },
          },
        },
        bgcolor: '#322f33',
      },
      scene: {
        xaxis: {
          automargin: true,
          gridcolor: '#403e41',
          linecolor: '#5b5a5c',
          rangeslider: {
            visible: false,
          },
          showline: true,
          ticks: 'outside',
          ticklen: 5,
          tickcolor: '#2d2a2e',
          tickfont: {
            color: '#c0bfbf',
          },
          title: {
            font: {
              color: '#f0f0ee',
            },
          },
          legend: {
            font: {
              color: '#f0f0ee',
            },
          },
          showgrid: true,
        },
        yaxis: {
          automargin: true,
          gridcolor: '#403e41',
          linecolor: '#5b5a5c',
          rangeslider: {
            visible: false,
          },
          showline: true,
          ticks: 'outside',
          ticklen: 5,
          tickcolor: '#2d2a2e',
          tickfont: {
            color: '#c0bfbf',
          },
          title: {
            font: {
              color: '#f0f0ee',
            },
          },
          legend: {
            font: {
              color: '#f0f0ee',
            },
          },
          zerolinecolor: '#c0bfbf',
          zerolinewidth: 2,
        },
        zaxis: {
          automargin: true,
          gridcolor: '#403e41',
          linecolor: '#5b5a5c',
          rangeslider: {
            visible: false,
          },
          showline: true,
          ticks: 'outside',
          ticklen: 5,
          tickcolor: '#2d2a2e',
          tickfont: {
            color: '#c0bfbf',
          },
          title: {
            font: {
              color: '#f0f0ee',
            },
          },
          legend: {
            font: {
              color: '#f0f0ee',
            },
          },
        },
      },
      geo: {
        showcoastlines: true,
        showframe: false,
        showland: true,
        showocean: true,
        showlakes: true,
        showrivers: true,
        bgcolor: '#2d2a2e',
        coastlinecolor: '#322f33',
        landcolor: '#c0bfbf',
        oceancolor: '#373438',
        lakecolor: '#16306c',
        rivercolor: '#16306c',
      },
      datarevision: 0,
    },
  },
  autosize: true,
};

export function AppRoot(): JSX.Element {
  return <Chart data={data} layout={layout} />;
}

export default AppRoot;
