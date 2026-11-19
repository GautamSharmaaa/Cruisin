export interface ProductSizeChart {
  columns: string[];
  rows: string[][];
}
export function readSizeChart(value?: string): ProductSizeChart | undefined;
export function writeSizeChart(chart: ProductSizeChart): string;
