'use client';

import type { AssistantReply } from '@dari/contracts';
import Link from 'next/link';
import { type FormEvent, useEffect, useRef, useState, useTransition } from 'react';
import { askAssistant } from '@/actions/assistant';
import { track } from '@/components/analytics/track';
import { LogoMark } from '@/components/brand/logo';
import { SearchIcon } from '@/components/ui/icons';

type Turn = { role: 'user'; content: string } | { role: 'assistant'; content: string; reply?: AssistantReply };

const STARTERS = ['بدي مطعم فاتح هلق', 'احجزلي ملعب بكرا', 'في رحلة هالأسبوع؟', 'بدي شقة للإيجار', 'شو أخبار سلمية؟'];

/** CITY AI: conversational front door to the whole platform (blueprint §15.1). */
export function AssistantChat() {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState('');
  const [pending, start] = useTransition();
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    end.current?.scrollIntoView({ behavior: 'smooth' });
  }, [turns, pending]);

  const send = (text: string) => {
    const message = text.trim();
    if (!message || pending) return;
    const history = turns.map((t) => ({ role: t.role, content: t.content }));
    setTurns((t) => [...t, { role: 'user', content: message }]);
    setInput('');
    track({ name: 'assistant.message' });
    start(async () => {
      const res = await askAssistant(message, history);
      setTurns((t) => [...t, 'error' in res ? { role: 'assistant', content: res.error } : { role: 'assistant', content: res.reply, reply: res }]);
    });
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    send(input);
  };

  return (
    <div className="night flex min-h-[70dvh] flex-col overflow-hidden rounded-[2rem] text-ivory">
      <div className="flex-1 space-y-4 overflow-y-auto p-5 sm:p-8" aria-live="polite">
        {turns.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <LogoMark className="h-16 w-14" />
            <h1 className="font-display text-3xl font-bold">مساعد سلمية الذكي</h1>
            <p className="max-w-md text-ivory/70">اسألني عن أي شي بالمدينة: أكل، خدمات، حجوزات، شغل، عقارات أو فعاليات — وبوصلك للخطوة التالية.</p>
            <div className="mt-2 flex flex-wrap justify-center gap-2">
              {STARTERS.map((s) => (
                <button key={s} type="button" onClick={() => send(s)} className="rounded-full border border-champagne/30 px-4 py-2 text-sm text-champagne hover:bg-white/10">{s}</button>
              ))}
            </div>
          </div>
        )}
        {turns.map((t, i) =>
          t.role === 'user' ? (
            <p key={i} className="ms-auto max-w-[85%] rounded-3xl rounded-ee-md bg-gold px-4 py-3 font-medium text-navy">{t.content}</p>
          ) : (
            <div key={i} className="max-w-[90%] space-y-3">
              <p className="rounded-3xl rounded-es-md bg-white/10 px-4 py-3 leading-relaxed">{t.content}</p>
              {t.reply && t.reply.actions.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {t.reply.actions.map((a) => (
                    <Link key={a.href + a.label} href={a.href} className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-navy hover:bg-champagne">{a.label}</Link>
                  ))}
                </div>
              )}
            </div>
          ),
        )}
        {pending && <p className="w-fit animate-pulse rounded-3xl bg-white/10 px-4 py-3">…</p>}
        <div ref={end} />
      </div>
      <form onSubmit={submit} className="flex gap-2 border-t border-white/10 bg-navy/60 p-3">
        <label htmlFor="assistant-input" className="sr-only">اكتب سؤالك</label>
        <input id="assistant-input" value={input} onChange={(e) => setInput(e.target.value)} placeholder="اكتب سؤالك…" maxLength={500} className="h-12 flex-1 rounded-full bg-white px-5 text-ink focus:outline-none" />
        <button type="submit" disabled={pending || !input.trim()} aria-label="إرسال" className="grid h-12 w-12 place-items-center rounded-full bg-gold text-navy disabled:opacity-50">
          <SearchIcon className="h-5 w-5" />
        </button>
      </form>
    </div>
  );
}
