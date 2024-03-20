import type { TransformSeries } from "metabase/visualizations/components/TransformedVisualization";

export const funnelToBarTransform: TransformSeries = (
  rawSeries,
  settings,
  renderingContext,
) => {
  const [series] = rawSeries;
  const {
    card,
    data: { cols, rows },
  } = series;

  const dimensionIndex = cols.findIndex(
    col => col.name === settings["funnel.dimension"],
  );
  const metricIndex = cols.findIndex(
    col => col.name === settings["funnel.metric"],
  );

  return rows.map((row, index) => {
    const name = renderingContext.formatValue(row[dimensionIndex], {
      column: cols[dimensionIndex],
    });
    return {
      card: {
        ...card,
        id: index,
        name,
        display: "bar",
        visualization_settings: {
          "card.title": card.name,
          "graph.tooltip_type": "default",
          "stackable.stack_type": "stacked" as const,
          "graph.dimensions": [settings["funnel.dimension"]],
          "graph.metrics": [name],
          "graph.y_axis.auto_split": false,
        },
      },
      data: {
        rows: [[row[dimensionIndex], row[metricIndex]]],
        cols: [
          cols[dimensionIndex],
          {
            ...cols[metricIndex],
            name,
          },
        ],
        rows_truncated: 0,
        results_metadata: { columns: [] },
      },
    };
  });
};