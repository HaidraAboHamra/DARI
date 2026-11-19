import type { BookableResource, Booking } from '@dari/contracts';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { auth, createHarness, type Harness, login, loginAs } from './helpers/harness';
import { businessByName, localDatePlus } from './helpers/lookup';
import { outboxRelay } from './helpers/worker';

describe('bookings (e2e)', () => {
  let h: Harness;
  let citizen: string;
  let admin: string;
  let court: BookableResource;
  let rooms: BookableResource[];

  beforeAll(async () => {
    h = await createHarness();
    [citizen, admin] = await Promise.all([loginAs(h.app, 'citizen'), loginAs(h.app, 'admin')]);
    const stadium = await businessByName(h.app, 'ملعب النجوم');
    court = (await h.app.inject({ method: 'GET', url: `/api/v1/businesses/${stadium.id}/resources` })).json()[0];
    const hotel = await businessByName(h.app, 'فندق سلمية جراند');
    rooms = (await h.app.inject({ method: 'GET', url: `/api/v1/businesses/${hotel.id}/resources` })).json();
  });
  afterAll(() => h.close());

  const book = (token: string, payload: object) => h.app.inject({ method: 'POST', url: '/api/v1/bookings', headers: auth(token), payload });

  it('lists free slots and lets exactly one of two concurrent users take the last one', async () => {
    const date = localDatePlus(2);
    const res = await h.app.inject({ method: 'GET', url: `/api/v1/resources/${court.id}/slots?date=${date}` });
    const { slots } = res.json();
    expect(slots).toHaveLength(9); // 14:00–23:00, 60 min
    const slot = slots[3];

    const other = await login(h.app, '0944555666');
    const results = await Promise.all([book(citizen, { resourceId: court.id, startsAt: slot.startsAt }), book(other, { resourceId: court.id, startsAt: slot.startsAt })]);
    expect(results.map((r) => r.statusCode).sort()).toEqual([201, 409]);
    const winner = results.find((r) => r.statusCode === 201)!.json<Booking>();
    expect(winner).toMatchObject({ status: 'confirmed', total: 120_000, resourceName: 'ملعب خماسي' }); // auto-confirm court
    expect(results.find((r) => r.statusCode === 409)!.json().error.code).toBe('SLOT_TAKEN');

    const after = (await h.app.inject({ method: 'GET', url: `/api/v1/resources/${court.id}/slots?date=${date}` })).json();
    expect(after.slots[3].available).toBe(0);
  });

  it('rejects times outside working hours', async () => {
    const date = localDatePlus(2);
    const res = await book(citizen, { resourceId: court.id, startsAt: `${date}T05:00:00.000Z` });
    expect(res.statusCode).toBe(400);
  });

  it('books hotel nights within room capacity and frees capacity on cancellation', async () => {
    const suite = rooms.find((r) => r.name === 'جناح عائلي')!; // capacity 2, manual confirmation
    const checkIn = localDatePlus(5);
    const checkOut = localDatePlus(7);
    const quote = (await h.app.inject({ method: 'GET', url: `/api/v1/resources/${suite.id}/nights?checkIn=${checkIn}&checkOut=${checkOut}` })).json();
    expect(quote).toMatchObject({ nights: 2, available: 2, total: 1_200_000 });

    const first = (await book(citizen, { resourceId: suite.id, checkIn, checkOut })).json<Booking>();
    expect(first.status).toBe('pending');
    expect((await book(citizen, { resourceId: suite.id, checkIn, checkOut })).statusCode).toBe(201);
    expect((await book(citizen, { resourceId: suite.id, checkIn: localDatePlus(6), checkOut: localDatePlus(8) })).json().error.code).toBe('SLOT_TAKEN');

    const cancel = await h.app.inject({ method: 'PATCH', url: `/api/v1/bookings/${first.id}/status`, headers: auth(citizen), payload: { status: 'cancelled' } });
    expect(cancel.json().status).toBe('cancelled');
    expect((await book(citizen, { resourceId: suite.id, checkIn: localDatePlus(6), checkOut: localDatePlus(8) })).statusCode).toBe(201);
  });

  it('lets the business confirm, and notifies both sides through the outbox', async () => {
    const suite = rooms.find((r) => r.name === 'جناح عائلي')!;
    const booking = (await book(citizen, { resourceId: suite.id, checkIn: localDatePlus(20), checkOut: localDatePlus(21) })).json<Booking>();

    expect((await h.app.inject({ method: 'PATCH', url: `/api/v1/bookings/${booking.id}/status`, headers: auth(citizen), payload: { status: 'confirmed' } })).statusCode).toBe(403);
    const confirmed = await h.app.inject({ method: 'PATCH', url: `/api/v1/bookings/${booking.id}/status`, headers: auth(admin), payload: { status: 'confirmed' } });
    expect(confirmed.json().status).toBe('confirmed');
    // Completion is only possible after the stay starts.
    expect((await h.app.inject({ method: 'PATCH', url: `/api/v1/bookings/${booking.id}/status`, headers: auth(admin), payload: { status: 'completed' } })).statusCode).toBe(409);

    await outboxRelay(h.app).drainOnce();
    const inbox = (await h.app.inject({ method: 'GET', url: '/api/v1/me/notifications', headers: auth(citizen) })).json();
    expect(inbox.items.map((n: { title: string }) => n.title)).toContain('تم تأكيد حجزك');
  });

  it('enforces plan limits on bookable resources', async () => {
    const merchant = await loginAs(h.app, 'merchant');
    const restaurant = await businessByName(h.app, 'مطعم الشام');
    const create = (name: string) =>
      h.app.inject({
        method: 'POST',
        url: `/api/v1/merchant/businesses/${restaurant.id}/resources`,
        headers: auth(merchant),
        payload: { name, kind: 'table', unit: 'slot', slotMinutes: 90, capacity: 4, weeklyHours: [{ day: 5, open: '12:00', close: '23:00' }] },
      });
    expect((await create('طاولة عائلية')).statusCode).toBe(201);
    const second = await create('طاولة ثانية');
    expect(second.statusCode).toBe(409);
    expect(second.json().error.code).toBe('PLAN_LIMIT');
  });
});
