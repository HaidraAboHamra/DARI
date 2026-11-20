import type { MapLayers } from '@dari/contracts';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { auth, createHarness, type Harness, loginAs } from './helpers/harness';

describe('live city map layers (e2e)', () => {
  let h: Harness;
  beforeAll(async () => {
    h = await createHarness();
  });
  afterAll(() => h.close());

  const layers = async () => (await h.app.inject({ method: 'GET', url: '/api/v1/map/layers?city=salamiyah' })).json<MapLayers>();

  it('returns businesses, events, listings and news with positions', async () => {
    const m = await layers();
    expect(m.center.lat).toBeCloseTo(35.01, 1);
    expect(m.businesses.length).toBeGreaterThan(10);
    expect(m.businesses.find((b) => b.name === 'مطعم الشام')).toMatchObject({ vertical: 'food', isOpen: expect.any(Boolean) });
    expect(m.news.map((n) => n.title)).toContain('مهرجان سلمية الصيفي يعود هذا الأسبوع');
    expect(m.news.every((n) => typeof n.fresh === 'boolean')).toBe(true);
    expect(m.events.length).toBeGreaterThan(0);
    expect(m.listings.length).toBeGreaterThan(0);
  });

  it('puts a newly published geo-tagged story on the map', async () => {
    const editor = await loginAs(h.app, 'editor');
    const res = await h.app.inject({
      method: 'POST',
      url: '/api/v1/news',
      headers: auth(editor),
      payload: { citySlug: 'salamiyah', title: 'افتتاح حديقة جديدة في الحي الجنوبي', summary: 'حديقة عائلية بمساحات خضراء وألعاب للأطفال.', body: 'افتتحت البلدية اليوم حديقة جديدة في الحي الجنوبي مع ممرات ومقاعد وإنارة.', status: 'published', location: { lat: 35.0031, lng: 37.0547 } },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().location).toEqual({ lat: 35.0031, lng: 37.0547 });
    // The map is cached briefly (live within 30 s); drop the cache to assert immediately.
    await h.app.get((await import('../src/infrastructure/redis/cache.service')).CacheService).invalidate(`map:layers:${(await h.app.inject({ method: 'GET', url: '/api/v1/cities/salamiyah' })).json().id}`);
    expect((await layers()).news.map((n) => n.title)).toContain('افتتاح حديقة جديدة في الحي الجنوبي');
  });
});
