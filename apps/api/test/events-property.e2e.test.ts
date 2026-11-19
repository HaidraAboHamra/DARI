import type { CityEvent, PropertyListing, SearchResponse, Ticket } from '@dari/contracts';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { auth, createHarness, type Harness, login, loginAs } from './helpers/harness';
import { outboxRelay } from './helpers/worker';

describe('events & trips (e2e)', () => {
  let h: Harness;
  let citizen: string;
  let organizer: string;
  let event: CityEvent;

  beforeAll(async () => {
    h = await createHarness();
    [citizen, organizer] = await Promise.all([loginAs(h.app, 'citizen'), loginAs(h.app, 'merchant')]);
    const created = await h.app.inject({
      method: 'POST',
      url: '/api/v1/events',
      headers: auth(organizer),
      payload: {
        citySlug: 'salamiyah',
        kind: 'event',
        title: 'ورشة تصوير بالموبايل',
        description: 'ورشة عملية لتعلم أساسيات التصوير بالهاتف المحمول.',
        venue: 'المركز الثقافي',
        startsAt: new Date(Date.now() + 3 * 86_400_000).toISOString(),
        capacity: 3,
        price: 10_000,
      },
    });
    expect(created.statusCode).toBe(201);
    event = created.json();
  });
  afterAll(() => h.close());

  const buy = (token: string, quantity: number) => h.app.inject({ method: 'POST', url: `/api/v1/events/${event.id}/tickets`, headers: auth(token), payload: { quantity } });

  it('never oversells seats under concurrent purchases', async () => {
    const other = await login(h.app, '0955444333');
    const [a, b] = await Promise.all([buy(citizen, 2), buy(other, 2)]);
    expect([a.statusCode, b.statusCode].sort()).toEqual([201, 409]);
    const loser = [a, b].find((r) => r.statusCode === 409)!;
    expect(loser.json().error).toMatchObject({ code: 'SOLD_OUT', details: { seatsLeft: 1 } });
    const fresh = (await h.app.inject({ method: 'GET', url: `/api/v1/events/${event.id}` })).json<CityEvent>();
    expect(fresh.seatsLeft).toBe(1);
  });

  it('checks a ticket in exactly once, by the organizer only', async () => {
    const ticket = (await buy(citizen, 1)).json<Ticket>();
    expect(ticket).toMatchObject({ quantity: 1, total: 10_000, status: 'active' });
    expect(ticket.code).toMatch(/^T-[0-9A-Z]{8}$/);

    const scan = (token: string) => h.app.inject({ method: 'POST', url: `/api/v1/events/${event.id}/check-in`, headers: auth(token), payload: { code: ticket.code.toLowerCase() } });
    expect((await scan(citizen)).statusCode).toBe(403);
    const ok = await scan(organizer);
    expect(ok.json()).toMatchObject({ status: 'checked_in', holderName: 'أحمد محمد' });
    expect((await scan(organizer)).json().error.code).toBe('TICKET_USED');

    await outboxRelay(h.app).drainOnce();
    const inbox = (await h.app.inject({ method: 'GET', url: '/api/v1/me/notifications', headers: auth(organizer) })).json();
    expect(inbox.items.some((n: { type: string }) => n.type === 'ticket.purchased')).toBe(true);
  });

  it('releases seats when a ticket is cancelled', async () => {
    const mine = (await h.app.inject({ method: 'GET', url: '/api/v1/me/tickets', headers: auth(citizen) })).json<Ticket[]>();
    const active = mine.find((t) => t.status === 'active' && t.quantity === 2)!;
    expect((await h.app.inject({ method: 'POST', url: `/api/v1/me/tickets/${active.id}/cancel`, headers: auth(citizen) })).json().status).toBe('cancelled');
    expect((await h.app.inject({ method: 'GET', url: `/api/v1/events/${event.id}` })).json().seatsLeft).toBe(2);
  });

  it('finds trips through universal search', async () => {
    const res = (await h.app.inject({ method: 'GET', url: `/api/v1/search?city=salamiyah&q=${encodeURIComponent('في رحلة على طرطوس؟')}` })).json<SearchResponse>();
    expect(res.intent.intent).toBe('travel');
    expect(res.hits[0]).toMatchObject({ kind: 'event', item: { kind: 'trip', title: 'رحلة إلى طرطوس' } });
  });
});

describe('real estate (e2e)', () => {
  let h: Harness;
  let citizen: string;
  let owner: string;

  beforeAll(async () => {
    h = await createHarness();
    [citizen, owner] = await Promise.all([loginAs(h.app, 'citizen'), loginAs(h.app, 'admin')]);
  });
  afterAll(() => h.close());

  it('filters listings by purpose, type and price', async () => {
    const rent = (await h.app.inject({ method: 'GET', url: '/api/v1/listings?city=salamiyah&purpose=rent' })).json();
    expect(rent.items.every((l: PropertyListing) => l.purpose === 'rent')).toBe(true);
    expect(rent.items).toHaveLength(3);
    const cheapSale = (await h.app.inject({ method: 'GET', url: '/api/v1/listings?city=salamiyah&purpose=sale&maxPrice=350000000' })).json();
    expect(cheapSale.items.map((l: PropertyListing) => l.propertyType)).toEqual(['land']);
  });

  it('turns a viewing request into a lead for the owner, once', async () => {
    const listings = (await h.app.inject({ method: 'GET', url: '/api/v1/listings?city=salamiyah&propertyType=apartment' })).json();
    const flat: PropertyListing = listings.items[0];
    const request = () => h.app.inject({ method: 'POST', url: `/api/v1/listings/${flat.id}/viewings`, headers: auth(citizen), payload: { preferredTime: 'السبت مساءً' } });
    expect((await request()).statusCode).toBe(201);
    expect((await request()).json().error.code).toBe('ALREADY_REQUESTED');

    const leads = (await h.app.inject({ method: 'GET', url: '/api/v1/me/listings/leads', headers: auth(owner) })).json();
    expect(leads[0]).toMatchObject({ listingTitle: flat.title, phone: '+963900000005', status: 'new', preferredTime: 'السبت مساءً' });
    expect((await h.app.inject({ method: 'PATCH', url: `/api/v1/me/listings/leads/${leads[0].id}`, headers: auth(citizen), payload: { status: 'closed' } })).statusCode).toBe(403);
    expect((await h.app.inject({ method: 'PATCH', url: `/api/v1/me/listings/leads/${leads[0].id}`, headers: auth(owner), payload: { status: 'contacted' } })).statusCode).toBe(204);
  });

  it('answers property needs from universal search', async () => {
    const res = (await h.app.inject({ method: 'GET', url: `/api/v1/search?city=salamiyah&q=${encodeURIComponent('بدي شقة للإيجار')}` })).json<SearchResponse>();
    expect(res.intent.intent).toBe('property');
    expect(res.hits[0]).toMatchObject({ kind: 'listing', item: { propertyType: 'apartment', purpose: 'rent' } });
  });
});
