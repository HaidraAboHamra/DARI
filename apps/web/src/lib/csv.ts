/**
 * Minimal RFC 4180 CSV parser (quoted fields, escaped quotes, CRLF, BOM).
 * Enough for spreadsheet exports (Excel / Google Sheets "Save as CSV").
 */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  const input = text.replace(/^﻿/, '');
  for (let i = 0; i < input.length; i++) {
    const ch = input[i]!;
    if (quoted) {
      if (ch === '"' && input[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',' || ch === ';' || ch === '\t') {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && input[i + 1] === '\n') i++;
      row.push(field);
      if (row.some((c) => c.trim() !== '')) rows.push(row);
      row = [];
      field = '';
    } else field += ch;
  }
  row.push(field);
  if (row.some((c) => c.trim() !== '')) rows.push(row);
  return rows;
}

const HEADER_ALIASES: Record<string, string> = {
  name: 'name', الاسم: 'name', المنتج: 'name',
  price: 'price', السعر: 'price',
  section: 'section', القسم: 'section',
  description: 'description', الوصف: 'description',
  stock: 'stock', المخزون: 'stock', الكمية: 'stock',
};

/** Maps a CSV with a header row (Arabic or English) to product rows. */
export function csvToProducts(text: string): Record<string, string | number | null>[] {
  const [header, ...body] = parseCsv(text);
  if (!header) return [];
  const keys = header.map((h) => HEADER_ALIASES[h.trim().toLowerCase()] ?? null);
  return body.map((cells) => {
    const row: Record<string, string | number | null> = {};
    keys.forEach((key, i) => {
      const value = (cells[i] ?? '').trim();
      if (!key || value === '') return;
      row[key] = key === 'price' || key === 'stock' ? Number(value.replace(/[^\d]/g, '')) : value;
    });
    return row;
  });
}
