import {inspectWorkbookZip} from './workbookSafety.mjs';

async function inspectSheets(buffer: ArrayBuffer) {
  const [{Unzip, UnzipInflate}, {Parser}] = await Promise.all([import('fflate'), import('saxen')]);
  const decoder = new TextDecoder('utf-8', {fatal: true});
  let expanded = 0;
  let sheetNumber = 0;
  let firstVisible = 0;
  let count = 0;
  const names = new Set<string>();
  const archive = new Unzip(entry => {
    if (++count > 2000 || names.has(entry.name)) throw Error('Invalid workbook directory.');
    names.add(entry.name);
    const workbook = entry.name === 'xl/workbook.xml';
    const worksheet = /^xl\/worksheets\/[^/]+\.xml$/.test(entry.name);
    const chunks: Uint8Array[] = [];
    entry.ondata = (error, chunk, final) => {
      if (error) throw error;
      expanded += chunk.length;
      if (expanded > 20_000_000) throw Error('Workbook expands beyond 20 MB.');
      if (!workbook && !worksheet) return;
      chunks.push(chunk);
      if (!final) return;
      const size = chunks.reduce((sum, part) => sum + part.length, 0);
      const bytes = new Uint8Array(size);
      let offset = 0;
      for (const part of chunks) { bytes.set(part, offset); offset += part.length; }
      const parser = new Parser();
      parser.on('error', (err: Error) => { throw err; });
      parser.on('openTag', (tag: string, getAttrs: () => Record<string,string>) => {
        const local = tag.split(':').pop();
        if (workbook && local === 'sheet') {
          sheetNumber++;
          const state = getAttrs().state;
          if (!firstVisible && (!state || state === 'visible')) firstVisible = sheetNumber;
        }
        if (worksheet && local === 'f') throw Error('Convert spreadsheet formulas to values before import.');
        if (worksheet && (local === 'c' || local === 'row' || local === 'dimension')) {
          const attrs = getAttrs();
          const refs = local === 'dimension' ? attrs.ref?.split(':') : [attrs.r];
          for (const ref of refs || []) {
            if (!ref) continue;
            if (local === 'row' && /^\d+$/.test(ref) && Number(ref) <= 501) continue;
            const match = /^([A-Z]{1,2})([1-9]\d{0,2})$/.exec(ref);
            if (!match || Number(match[2]) > 501 || (match[1].length === 2 && match[1] > 'AN'))
              throw Error('Use up to 500 records and 40 columns per sheet.');
          }
        }
      });
      parser.parse(decoder.decode(bytes));
    };
    entry.start();
  });
  archive.register(UnzipInflate);
  const input = new Uint8Array(buffer);
  for (let p = 0; p < input.length; p += 2048) archive.push(input.subarray(p, p + 2048), p + 2048 >= input.length);
  if (!firstVisible) throw Error('Include at least one visible worksheet.');
  return firstVisible;
}

export async function readWorkbook(file: File) {
  if (file.size > 2_000_000) throw Error('Choose a workbook smaller than 2 MB.');
  const buffer = await file.arrayBuffer();
  inspectWorkbookZip(buffer);
  const firstVisible = await inspectSheets(buffer);
  const {readSheet} = await import('read-excel-file/universal');
  const data = await readSheet(buffer, firstVisible, {trim: false});
  const width = data.reduce((max, row) => Math.max(max, row.length), 0);
  if (data.length > 501 || width > 40) throw Error('Use up to 500 records and 40 columns.');
  const rows = data.filter(row => row.some(value => value != null)).map(row =>
    Array.from({length: width}, (_, i) => {
      const value = row[i];
      return value instanceof Date ? value.toISOString().slice(0,10) : String(value ?? '');
    })
  );
  if (rows.length < 2 || new Set(rows[0]).size !== width) throw Error('Include unique column headers and at least one record.');
  return rows;
}

export async function workbookBlob(sheets: {name: string; rows: (string | number | null)[][]}[]) {
  const {default: writeExcel} = await import('write-excel-file/universal');
  return writeExcel(sheets.map(({name, rows}) => ({
    sheet: name, stickyRowsCount: 1,
    columns: (rows[0] || []).map(() => ({width: 28})),
    data: rows.map((row, index) => row.map(value => typeof value === 'number'
      ? {type: Number, value, fontWeight: index === 0 ? 'bold' as const : undefined}
      : {type: String, value: String(value ?? ''), fontWeight: index === 0 ? 'bold' as const : undefined}))
  }))).toBlob();
}
