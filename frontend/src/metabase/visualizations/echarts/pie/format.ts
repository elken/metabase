import { computeMaxDecimalsForValues } from "metabase/visualizations/lib/utils";
import type {
  ComputedVisualizationSettings,
  RenderingContext,
} from "metabase/visualizations/types";

import type { PieChartModel } from "./model/types";

export interface PieChartFormatters {
  formatDimension: (value: unknown) => string;
  formatMetric: (value: unknown) => string;
  formatPercent: (value: unknown, location: "legend" | "chart") => string;
}

export function getPieChartFormatters(
  chartModel: PieChartModel,
  settings: ComputedVisualizationSettings,
  renderingContext: RenderingContext,
): PieChartFormatters {
  const { column: getColumnSettings } = settings;
  if (!getColumnSettings) {
    throw Error(`"settings.column" is undefined`);
  }

  const dimensionColSettings = getColumnSettings(
    chartModel.colDescs.dimensionDesc.column,
  );
  const metricColSettings = getColumnSettings(
    chartModel.colDescs.metricDesc.column,
  );

  const formatDimension = (value: unknown) =>
    renderingContext.formatValue(value, {
      ...dimensionColSettings,
      majorWidth: 0,
    });

  const formatMetric = (value: unknown) =>
    renderingContext.formatValue(value, {
      ...metricColSettings,
      majorWidth: 0,
    });

  const formatPercent = (value: unknown, location: "legend" | "chart") =>
    renderingContext.formatValue(value, {
      column: metricColSettings.column,
      number_separators: metricColSettings.number_separators as string,
      number_style: "percent",
      majorWidth: 0,
      decimals: computeMaxDecimalsForValues(
        chartModel.slices.map(s => s.normalizedPercentage),
        {
          style: "percent",
          maximumSignificantDigits: location === "legend" ? 3 : 2,
        },
      ),
    });

  return { formatDimension, formatMetric, formatPercent };
}
