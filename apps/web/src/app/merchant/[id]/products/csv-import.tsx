'use client';

import { useState, useTransition } from 'react';
import { importProducts } from '@/actions/merchant';
import { Button } from '@/components/ui/button';
import { csvToProducts } from '@/lib/csv';

/** Paste or upload a spreadsheet export; preview; import in one go. */
export function CsvImport({ businessId }: { businessId: string }) {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [result, setResult] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const load = async (file: File | undefined) => {
    if (!file) return;
    setRows(csvToProducts(await file.text()));
    setResult(null);
  };

  return (
    <details className="card p-5">
      <summary className="cursor-pointer font-display text-lg font-bold text-navy">استيراد من ملف Excel / CSV</summary>
      <p className="mt-2 text-sm text-muted">احفظ الجدول بصيغة CSV مع أعمدة: الاسم، السعر، القسم، الوصف، المخزون (حتى 500 صنف).</p>
      <input type="file" accept=".csv,text/csv" className="mt-3 block text-sm" onChange={(e) => void load(e.target.files?.[0])} />
      {rows.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <span className="text-sm">{rows.length} صنف جاهز للاستيراد</span>
          <Button
            size="sm"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const res = await importProducts(businessId, rows);
                setResult(res.error ?? `تم استيراد ${res.created} صنف${res.errors?.length ? ` — ${res.errors.length} صف بحاجة تصحيح (أولها: صف ${res.errors[0]!.row})` : ''}`);
                if (!res.error) setRows([]);
              })
            }
          >
            استيراد
          </Button>
        </div>
      )}
      {result && <p role="status" className="mt-2 text-sm font-semibold">{result}</p>}
    </details>
  );
}
