const prefix = 'cruisin:size-chart:v1:';

export function readSizeChart(value = '') {
  const text = value.trim();
  if (text.startsWith(prefix)) {
    try {
      const chart = JSON.parse(text.slice(prefix.length));
      if (Array.isArray(chart.columns) && chart.columns.length && chart.columns.every(cell => typeof cell === 'string') &&
          Array.isArray(chart.rows) && chart.rows.every(row => Array.isArray(row) &&
            row.length === chart.columns.length && row.every(cell => typeof cell === 'string'))) {
        return { columns: chart.columns, rows: chart.rows };
      }
    } catch { /* Existing free-text guides are handled separately. */ }
    return undefined;
  }

  const [columns, ...rows] = text.split(/\r?\n/).filter(line => line.trim()).map(line => line.split('|').map(cell => cell.trim()));
  return columns?.length > 1 && rows.length && rows.every(row => row.length === columns.length) ? { columns, rows } : undefined;
}

export function writeSizeChart(chart) {
  return prefix + JSON.stringify({ columns: chart.columns, rows: chart.rows });
}
