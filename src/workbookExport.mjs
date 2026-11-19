const excelType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const colors = { ink: '#1C3330', dark: '#183D35', light: '#FFFFFF', stripe: '#F2F7F4', emphasis: '#DFF0E7' };
const symbols = { USD: '$', GBP: '£', EUR: '€', CAD: 'C$', AUD: 'A$' };

export function cellAddress(column, row) {
  let letter = '';
  for (let index = column + 1; index; index = Math.floor((index - 1) / 26)) {
    letter = String.fromCharCode(65 + (index - 1) % 26) + letter;
  }
  return letter + row;
}

function moneyFormat(currency) {
  const prefix = '"' + (symbols[currency] || 'USD ') + '"';
  return prefix + '#,##0.00;[Red](' + prefix + '#,##0.00);' + prefix + '0.00';
}

function normalizedValue(value, kind) {
  if (value == null || value === '') return { type: String, value: '' };
  if (kind === 'date' && typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && value >= '1900-03-01') {
    const date = new Date(value + 'T00:00:00Z');
    if (Number.isFinite(+date) && date.toISOString().slice(0, 10) === value) return { type: Date, value: date };
  }
  if (kind === 'money' || kind === 'percent' || kind === 'number') {
    const number = typeof value === 'number' ? value : /^[+-]?\d+(?:\.\d+)?$/.test(value) ? Number(value) : NaN;
    if (Number.isFinite(number)) return { type: Number, value: number };
  }
  if (typeof value === 'number' && Number.isFinite(value) && kind !== 'text') return { type: Number, value };
  return { type: String, value: String(value) };
}

function styleSheet(sheet) {
  const { name, rows, columns, currency, headerRows = [0], emphasisRows = [], freeze = 1 } = sheet;
  const widths = columns.map((column, col) => column.width ?? Math.min(42, Math.max(16,
    ...rows.slice(0, 100).map(row => String(row[col]?.value ?? row[col] ?? '').length + 3))));
  const headers = new Set(headerRows);
  const emphasis = new Set(emphasisRows);
  const cached = new Map();
  const data = rows.map((row, rowIndex) => widths.map((width, col) => {
    const entry = row[col];
    const cell = entry != null && typeof entry === 'object' ? entry : { value: entry };
    const header = headers.has(rowIndex);
    const kind = header ? 'text' : cell.kind ?? columns[col].kind;
    let value = normalizedValue(cell.value, kind);
    if (cell.formula) {
      value = { type: 'Formula', value: cell.formula };
      cached.set(cellAddress(col, rowIndex + 1), cell.value ?? '');
    }
    const lineCount = String(cell.value ?? '').split('\n').reduce((lines, line) =>
      lines + Math.max(1, Math.ceil(line.length / Math.max(8, width - 3))), 0);
    const format = value.type === String ? undefined
      : kind === 'date' && value.type === Date ? 'yyyy-mm-dd'
      : kind === 'money' ? moneyFormat(currency)
      : kind === 'percent' ? '0.0%;[Red](0.0%);0.0%'
      : kind === 'number' ? '#,##0' : undefined;
    return {
      ...value, format,
      align: header || value.type === String ? 'left' : kind === 'date' ? 'center' : 'right',
      alignVertical: 'center',
      wrap: header || value.type === String,
      height: Math.min(120, Math.max(header ? 29 : 21, lineCount * 15 + 7)),
      fontWeight: header || emphasis.has(rowIndex) ? 'bold' : undefined,
      textColor: header ? colors.light : colors.ink,
      backgroundColor: header ? colors.dark : emphasis.has(rowIndex) ? colors.emphasis
        : rowIndex % 2 ? colors.light : colors.stripe,
    };
  }));

  // The writer uses the first cell to determine the row height.
  for (const row of data) row[0].height = Math.max(...row.map(cell => cell.height));
  return {
    cached,
    sheet: {
      sheet: name, columns: widths.map(width => ({ width })), data,
      showGridLines: false, stickyRowsCount: freeze,
      stickyColumnsCount: columns.length > 8 ? 1 : undefined,
      orientation: columns.length > 5 ? 'landscape' : 'portrait',
    },
  };
}

function cacheResults(archive, styled, pack) {
  styled.forEach(({ cached }, index) => {
    if (cached.size === 0) return;
    const path = 'xl/worksheets/sheet' + (index + 1) + '.xml';
    const worksheet = pack.strFromU8(archive[path]);
    let populated = 0;
    const xml = worksheet.replace(/(<c\b[^>]*\br="([A-Z]+\d+)"[^>]*>)(<f>[^<]*<\/f>)(?:<v>[^<]*<\/v>)?<\/c>/g,
      (whole, cell, address, formula) => {
        if (!cached.has(address)) return whole;
        populated++;
        const value = cached.get(address);
        const numeric = typeof value === 'number' && Number.isFinite(value);
        const tag = numeric ? cell : cell.slice(0, -1).replace(/ t="[^"]*"/, '') + ' t="str">';
        return tag + formula + '<v>' + (numeric ? value : '') + '</v></c>';
      });
    if (populated !== cached.size) throw Error('The Excel export could not verify its formula cells.');
    archive[path] = pack.strToU8(xml);
  });
}

export async function renderExportWorkbook(sheets, writeExcel, pack) {
  const styled = sheets.map(styleSheet);
  const generated = await writeExcel(styled.map(item => item.sheet)).toBlob();
  if (styled.every(item => item.cached.size === 0)) return generated;
  const archive = pack.unzipSync(new Uint8Array(await generated.arrayBuffer()));
  cacheResults(archive, styled, pack);
  return new Blob([pack.zipSync(archive)], { type: excelType });
}
