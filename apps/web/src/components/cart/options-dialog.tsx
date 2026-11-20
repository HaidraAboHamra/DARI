'use client';

import { defaultChoices, optionErrorMessage, priceLine, type Product } from '@dari/contracts';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { money } from '@/lib/format';

/** Customize a product (size, extras, note) before adding it to the cart. */
export function OptionsDialog({ product, onClose, onAdd }: { product: Product; onClose: () => void; onAdd: (choices: string[], note: string, quantity: number) => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [choices, setChoices] = useState<string[]>(() => defaultChoices(product.options));
  const [note, setNote] = useState('');
  const [quantity, setQuantity] = useState(1);
  useEffect(() => ref.current?.showModal(), []);

  const priced = priceLine(product.price, product.options, choices);
  const toggle = (groupId: string, choiceId: string) => {
    const group = product.options.find((g) => g.id === groupId)!;
    const inGroup = new Set(group.choices.map((c) => c.id));
    setChoices((current) => {
      if (group.max === 1) return [...current.filter((c) => !inGroup.has(c)), choiceId];
      if (current.includes(choiceId)) return current.filter((c) => c !== choiceId);
      return current.filter((c) => inGroup.has(c)).length < group.max ? [...current, choiceId] : current;
    });
  };

  return (
    <dialog ref={ref} onClose={onClose} className="m-auto w-[min(92vw,30rem)] rounded-3xl p-0 backdrop:bg-navy/60" aria-label={product.name}>
      <form method="dialog" className="flex max-h-[85vh] flex-col">
        {product.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.imageUrl} alt="" className="h-48 w-full object-cover" />
        )}
        <div className="flex flex-col gap-4 overflow-y-auto p-5">
          <div>
            <h3 className="font-display text-xl font-bold text-navy">{product.name}</h3>
            {product.description && <p className="mt-1 text-sm text-muted">{product.description}</p>}
          </div>
          {product.options.map((g) => (
            <fieldset key={g.id} className="flex flex-col gap-2">
              <legend className="mb-1 flex w-full justify-between text-sm font-bold text-navy">
                <span>{g.name}</span>
                <span className="font-normal text-muted">{g.min > 0 ? 'مطلوب' : `اختياري${g.max > 1 ? ` · حتى ${g.max}` : ''}`}</span>
              </legend>
              {g.choices.map((c) => (
                <label key={c.id} className="flex cursor-pointer items-center gap-3 rounded-2xl border border-sand px-4 py-3 has-[:checked]:border-gold has-[:checked]:bg-champagne/20">
                  <input type={g.max === 1 ? 'radio' : 'checkbox'} name={g.id} checked={choices.includes(c.id)} onChange={() => toggle(g.id, c.id)} className="accent-gold" />
                  <span className="flex-1">{c.name}</span>
                  {c.price > 0 && <span className="text-sm text-gold-deep">+ {money(c.price)}</span>}
                </label>
              ))}
            </fieldset>
          ))}
          <label className="flex flex-col gap-1 text-sm font-bold text-navy">
            ملاحظة للمطبخ
            <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} placeholder="مثلاً: بدون بصل" className="rounded-2xl border border-sand px-4 py-3 font-normal" />
          </label>
        </div>
        <div className="flex items-center gap-3 border-t border-sand p-4">
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setQuantity((q) => Math.max(1, q - 1))} className="h-9 w-9 rounded-full border border-sand" aria-label="إنقاص">−</button>
            <span className="w-6 text-center font-bold">{quantity}</span>
            <button type="button" onClick={() => setQuantity((q) => Math.min(99, q + 1))} className="h-9 w-9 rounded-full border border-sand" aria-label="زيادة">+</button>
          </div>
          <Button type="button" className="flex-1 justify-between" disabled={!priced.ok} onClick={() => priced.ok && onAdd(choices, note, quantity)}>
            <span>{priced.ok ? 'أضف إلى السلة' : optionErrorMessage(priced.error)}</span>
            {priced.ok && <span>{money(priced.unitPrice * quantity)}</span>}
          </Button>
        </div>
      </form>
    </dialog>
  );
}
