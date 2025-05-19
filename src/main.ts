import { getChartContext, type Query, type ChartModel, type ChartConfig, CustomChartContext, ChartToTSEvent, ColumnType, type ChartConfigEditorDefinition } from '@thoughtspot/ts-chart-sdk';
import '../new-style.css'


import {
  Chart,
  BarController,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from 'chart.js';

import * as _ from 'lodash';

// Register the required components
Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

let globalChartReference: Chart;

function getLegendColor(chartModel: ChartModel) {
  let visualPropsFromModel = chartModel?.visualProps as any;
  const legendColor = visualPropsFromModel['legendColor'] || 'green' 
  return legendColor;
}


function getAxisData(chartModel: ChartModel, axis: string) {
  
  const dataArr = chartModel.data?.[0]?.data;
  if(!dataArr) {
    return [];
  }
  const axisColumnId = chartModel.config.chartConfig?.[0].dimensions.find((dim: any) => dim.key === axis)?.columns[0].id;
  const idx = _.findIndex(dataArr?.columns, (colId) => colId === axisColumnId);
    const dataForCol = _.map(dataArr?.dataValue, (row) => {
        const colValue = row[idx];
        return colValue;
    });
  return dataForCol;
}


function render(sdkContext: CustomChartContext) {
  let localState = false

  const chartModel = sdkContext.getChartModel();

  const xAxisData = getAxisData(chartModel, 'x');
  const yAxisData = getAxisData(chartModel, 'y');

  
  const canvas = document.getElementById('my-chart') as HTMLCanvasElement;
  const ctx = canvas?.getContext('2d');

  if (!ctx) {
    return;
  }

  globalChartReference = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: xAxisData,
      datasets: [{
        label: 'Y Axis', 
        data: yAxisData,
        backgroundColor: [
          'rgba(255, 99, 132, 0.2)',
          'rgba(54, 162, 235, 0.2)',
          'rgba(255, 205, 86, 0.2)',
          'rgba(75, 192, 192, 0.2)',
          'rgba(111, 76, 182, 0.2)',
          'rgba(255, 159, 64, 0.2)'
        ],
        borderColor: [
          'rgb(255, 99, 132)',
          'rgb(54, 162, 235)',
          'rgb(255, 205, 86)',
          'rgb(75, 192, 192)',
          'rgb(153, 102, 255)',
          'rgb(255, 159, 64)'
        ],
        borderWidth: 1,
        hidden: localState
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: 'y',
      plugins: {
        legend: {
          position: 'top',
          labels: {
            color: getLegendColor(chartModel),
          },
          
        }
      },
      scales: {
        x: {
          beginAtZero: true, 
          ticks: {
            color: '#333' 
          }
        },
        y: {
          ticks: {
            color: '#333' 
          }
        }
      },
      animation: {
        duration: 1500, 
        easing: 'easeInOutQuad' 
      }
    }
  });

}

const renderChart = async (ctx: CustomChartContext): Promise<void> => {

  ctx.emitEvent(ChartToTSEvent.UpdateVisualProps, {
    visualProps: {
      ...chartModel.visualProps as any,
      clientState: JSON.stringify({
        legendVisible: true
      })
    }
  });
   if (globalChartReference) {
        globalChartReference.destroy();
    }
    try {
        ctx.emitEvent(ChartToTSEvent.RenderStart);
        await render(ctx);
    } catch (e) {
        ctx.emitEvent(ChartToTSEvent.RenderError, {
            hasError: true,
            error: e,
        });
    } finally {
        ctx.emitEvent(ChartToTSEvent.RenderComplete);
    }
};







async function renderChartSdk() {
  const customChartContext = await getChartContext({
   getDefaultChartConfig: (chartModel: ChartModel): ChartConfig[] => {
            const cols = chartModel.columns;

            const measureColumns = _.filter(
                cols,
                (col) => col.type === ColumnType.MEASURE,
            );

            const attributeColumns = _.filter(
                cols,
                (col) => col.type === ColumnType.ATTRIBUTE,
            );

            const axisConfig: ChartConfig = {
                key: 'column',
                dimensions: [
                    {
                        key: 'x',
                        columns: [attributeColumns[0]],
                    },
                    {
                        key: 'y',
                        columns: measureColumns.slice(0, 2),
                    },
                ],
            };
            return [axisConfig];
        },
        getQueriesFromChartConfig: (
            chartConfig: ChartConfig[],
        ): Array<Query> => {
            // map all the columns in the config to the query array
            return chartConfig.map(
                (config: ChartConfig): Query =>
                    _.reduce(
                        config.dimensions,
                        (acc: Query, dimension: { columns: any; }) => ({
                            queryColumns: [
                                ...acc.queryColumns,
                                ...dimension.columns,
                            ],
                        }),
                        {
                            queryColumns: [],
                            queryParams: {
                              size: 20000
                            }
                        } as Query,
                    ),
            );
        },
        renderChart: (context) => renderChart(context),
        chartConfigEditorDefinition: (
            currentChartConfig: ChartModel,
            _ctx: CustomChartContext,
        ): ChartConfigEditorDefinition[] => {
            const { config } = currentChartConfig;

            const yColumns = config?.chartConfig?.[0]?.dimensions.find(
                (dimension) => dimension.key === 'y' && dimension.columns,
            );

            const configDefinition = [
                {
                    key: 'column',
                    label: 'Custom Column',
                    descriptionText:
                        'X Axis can only have attributes, Y Axis can only have measures, Color can only have attributes. ' +
                        'Should have just 1 column in Y axis with colors columns.',
                    columnSections: [
                        {
                            key: 'x',
                            label: 'Custom X Axis',
                            allowAttributeColumns: true,
                            allowMeasureColumns: false,
                            allowTimeSeriesColumns: true,
                            maxColumnCount: 1,
                        },
                        {
                            key: 'y',
                            label: 'Custom Y Axis',
                            allowAttributeColumns: false,
                            allowMeasureColumns: true,
                            allowTimeSeriesColumns: false,
                        },
                    ],
                },
            ];
            if (yColumns?.columns.length) {
                for (let i = 0; i < yColumns.columns.length; i++) {
                    configDefinition[0].columnSections.push({
                        key: `layers${i}`,
                        label: `Measures layer${i}`,
                        allowAttributeColumns: false,
                        allowMeasureColumns: true,
                        allowTimeSeriesColumns: false,
                    });
                }
            }
            return configDefinition;
        },
        visualPropEditorDefinition: {elements: [
          {
            type: 'dropdown',
            label: 'Legend Color',
            key: 'legendColor',
            defaultValue: 'green',  
            values: [
              'green',
              'blue',
              'red',
              'yellow',
              'purple',
              'orange'
            ]
          }
        ]}
  })
  await renderChart(customChartContext);
}

renderChartSdk();