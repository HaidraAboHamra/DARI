'use client';

import type { MediaUpload } from '@dari/contracts';
import { useRef, useState } from 'react';

/**
 * Uploads images immediately and keeps their URLs as hidden form fields,
 * so the surrounding form/server action only deals with URLs.
 */
export function ImageUploader({ name, max = 6, initial = [] }: { name: string; max?: number; initial?: string[] }) {
  const [urls, setUrls] = useState<string[]>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    setError(null);
    try {
      for (const file of Array.from(files).slice(0, max - urls.length)) {
        const body = new FormData();
        body.set('file', file);
        const res = await fetch('/api/upload', { method: 'POST', body });
        const data = (await res.json()) as MediaUpload & { error?: { message: string } };
        if (!res.ok) throw new Error(data.error?.message ?? 'تعذر رفع الصورة');
        setUrls((u) => [...u, data.url]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر رفع الصورة');
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-semibold text-navy">الصور ({urls.length}/{max})</span>
      <div className="flex flex-wrap gap-2">
        {urls.map((url) => (
          <div key={url} className="relative h-24 w-24 overflow-hidden rounded-2xl border border-sand">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="" className="h-full w-full object-cover" />
            <input type="hidden" name={name} value={url} />
            <button type="button" onClick={() => setUrls((u) => u.filter((x) => x !== url))} className="absolute end-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-navy/80 text-xs text-white" aria-label="حذف الصورة">✕</button>
          </div>
        ))}
        {urls.length < max && (
          <label className="grid h-24 w-24 cursor-pointer place-items-center rounded-2xl border-2 border-dashed border-sand text-center text-xs text-muted hover:border-gold">
            {busy ? 'جارٍ الرفع…' : '+ صورة'}
            <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" disabled={busy} onChange={(e) => void upload(e.target.files)} />
          </label>
        )}
      </div>
      {error && <span className="text-xs text-danger">{error}</span>}
    </div>
  );
}
