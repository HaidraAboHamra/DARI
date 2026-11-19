import type { AssistantReply, Product, SmartInsight } from '@dari/contracts';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { auth, createHarness, type Harness, loginAs } from './helpers/harness';
import { businessByName } from './helpers/lookup';

describe('City AI assistant & smart insights (e2e)', () => {
  let h: Harness;
  beforeAll(async () => {
    delete process.env.ANTHROPIC_API_KEY; // exercise the deterministic engine
    process.env.ASSISTANT_HOURLY_LIMIT = '5';
    h = await createHarness();
  });
  afterAll(() => h.close());

  const ask = (message: string, headers: Record<string, string> = {}) =>
    h.app.inject({ method: 'POST', url: '/api/v1/assistant', headers, payload: { city: 'salamiyah', message } });

  it('turns a dialect need into grounded results and next actions', async () => {
    const res = (await ask('بدي سباك')).json<AssistantReply>();
    expect(res).toMatchObject({ engine: 'rules', intent: 'service' });
    expect(res.hits[0]).toMatchObject({ kind: 'business', item: { name: 'أبو سامر للسباكة' } });
    expect(res.reply).toContain('أبو سامر للسباكة');
    expect(res.actions.map((a) => a.href)).toEqual(expect.arrayContaining(['/services/new']));
  });

  it('answers trip and property questions with the right kind of results', async () => {
    const trips = (await ask('في رحلة هالأسبوع؟')).json<AssistantReply>();
    expect(trips.hits.length).toBeGreaterThan(0);
    expect(trips.hits.every((hit) => hit.kind === 'event' || (hit.kind === 'business' && hit.item.vertical === 'trips'))).toBe(true);
    const flats = (await ask('بدي شقة للإيجار')).json<AssistantReply>();
    expect(flats.hits.every((hit) => hit.kind === 'listing' || (hit.kind === 'business' && hit.item.vertical === 'property'))).toBe(true);
  });

  it('admits when nothing matches instead of inventing', async () => {
    const res = (await ask('تصليح ساعات أثرية')).json<AssistantReply>();
    expect(res.hits).toHaveLength(0);
    expect(res.reply).toContain('ما لقيت');
    expect(res.actions.map((a) => a.href)).toContain('/delivery');
  });

  it('caps assistant usage per caller', async () => {
    const token = await loginAs(h.app, 'editor');
    const codes: number[] = [];
    for (let i = 0; i < 6; i++) codes.push((await ask('مطعم', auth(token))).statusCode);
    expect(codes).toEqual([200, 200, 200, 200, 200, 429]);
  });

  it('flags low stock and pending bookings for the merchant', async () => {
    const admin = await loginAs(h.app, 'admin');
    const pizzeria = await businessByName(h.app, 'مطعم بيتزا إيطاليا');
    const menu: Product[] = (await h.app.inject({ method: 'GET', url: `/api/v1/businesses/${pizzeria.id}/products` })).json();
    const cola = menu.find((p) => p.name === 'كولا')!;
    await h.app.inject({ method: 'PATCH', url: `/api/v1/merchant/businesses/${pizzeria.id}/products/${cola.id}`, headers: auth(admin), payload: { stock: 2 } });
    const insights = (await h.app.inject({ method: 'GET', url: `/api/v1/merchant/businesses/${pizzeria.id}/smart-insights`, headers: auth(admin) })).json<SmartInsight[]>();
    expect(insights).toEqual(expect.arrayContaining([expect.objectContaining({ kind: 'low_stock', detail: 'كولا (2)' })]));
    // The pizzeria has a menu, so it must never be told it has none (regression: correlated subquery bound to the wrong table).
    expect(insights.map((i) => i.kind)).not.toContain('no_catalog');
  });
});
