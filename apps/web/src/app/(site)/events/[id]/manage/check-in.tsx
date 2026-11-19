'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { checkInTicket } from '@/actions/events';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/primitives';

interface Detector {
  detect(source: HTMLVideoElement): Promise<{ rawValue: string }[]>;
}
declare global {
  interface Window {
    BarcodeDetector?: new (opts: { formats: string[] }) => Detector;
  }
}

/** Door check-in: camera QR scanning where the browser supports it, manual code entry otherwise. */
export function CheckIn({ eventId }: { eventId: string }) {
  const [code, setCode] = useState('');
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [scanning, setScanning] = useState(false);
  const [pending, start] = useTransition();
  const video = useRef<HTMLVideoElement>(null);
  const supported = typeof window !== 'undefined' && 'BarcodeDetector' in window;

  const submit = (value: string) =>
    start(async () => {
      const r = await checkInTicket(eventId, value.trim().toUpperCase());
      setResult(r.ok ? { ok: true, text: `✓ دخول ${r.holder ?? ''} (${r.quantity} مقعد)` } : { ok: false, text: r.error ?? 'تذكرة غير صالحة' });
      setCode('');
    });

  useEffect(() => {
    if (!scanning || !window.BarcodeDetector) return;
    let stream: MediaStream | null = null;
    let stop = false;
    const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
    void navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } }).then(async (s) => {
      stream = s;
      if (!video.current) return;
      video.current.srcObject = s;
      await video.current.play();
      while (!stop) {
        const codes = await detector.detect(video.current).catch(() => []);
        if (codes[0]) {
          submit(codes[0].rawValue);
          await new Promise((r) => setTimeout(r, 2500));
        }
        await new Promise((r) => setTimeout(r, 300));
      }
    });
    return () => {
      stop = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanning]);

  return (
    <div className="card flex flex-col gap-3 p-5">
      {supported && (
        <Button variant={scanning ? 'secondary' : 'night'} onClick={() => setScanning((s) => !s)}>{scanning ? 'إيقاف الكاميرا' : 'مسح QR بالكاميرا'}</Button>
      )}
      {scanning && <video ref={video} className="aspect-square w-full rounded-2xl bg-navy object-cover" muted playsInline />}
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (code) submit(code); }}>
        <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="T-XXXXXXXX" dir="ltr" className="font-mono" />
        <Button type="submit" disabled={pending || !code}>تحقق</Button>
      </form>
      {result && <p role="status" className={`rounded-2xl px-4 py-3 text-center font-bold ${result.ok ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>{result.text}</p>}
    </div>
  );
}
