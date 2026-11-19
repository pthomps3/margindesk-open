const csvType = 'text/csv;charset=utf-8';

export function csvBlob(contents) {
  return new Blob(['\uFEFF', contents.replace(/^\uFEFF+/, '')], { type: csvType });
}

export function downloadBlob(filename, blob) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  try {
    anchor.href = url;
    anchor.download = filename;
    anchor.hidden = true;
    document.body.append(anchor);
    anchor.click();
  } finally {
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

export function downloadText(filename, contents, type = csvType) {
  downloadBlob(filename, type === csvType ? csvBlob(contents) : new Blob([contents], { type }));
}
