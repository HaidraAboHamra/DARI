import { describe, expect, it } from 'vitest';
import { csvToProducts, parseCsv } from '../csv';

describe('parseCsv', () => {
  it('handles quotes, escaped quotes, CRLF and BOM', () => {
    expect(parseCsv('﻿a,"b, c","say ""hi"""\r\n1,2,3\r\n')).toEqual([
      ['a', 'b, c', 'say "hi"'],
      ['1', '2', '3'],
    ]);
  });
});

describe('csvToProducts', () => {
  it('accepts Arabic headers and normalizes numbers', () => {
    expect(csvToProducts('الاسم,السعر,القسم,المخزون\nكنافة,"45,000",حلويات,\nمعمول,30000,,12')).toEqual([
      { name: 'كنافة', price: 45000, section: 'حلويات' },
      { name: 'معمول', price: 30000, stock: 12 },
    ]);
  });
});
