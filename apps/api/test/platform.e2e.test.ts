import type { SearchResponse } from '@dari/contracts';
import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DB, type Database } from '../src/infrastructure/database/database.module';
import { QUEUES, type SearchLogJob } from '../src/infrastructure/queue/queues';
import { IngestionProcessors } from '../src/worker/ingestion.processors';
import { loadEnv } from '../src/config/env';
import { auth, createHarness, type Harness, login, loginAs } from './helpers/harness';
import { outboxRelay } from './helpers/worker';

describe('platform (e2e)', () => {
  let h: Harness;
  let admin: string;
  let citizen: string;

  beforeAll(async () => {
    h = await createHarness();
    [admin, citizen] = await Promise.all([loginAs(h.app, 'admin'), loginAs(h.app, 'citizen')]);
  });
  afterAll(() => h.close());

  it('onboards a business through verification before it becomes public', async () => {
    const owner = await login(h.app, '0988123123');
    const created = await h.app.inject({
      method: 'POST',
      url: '/api/v1/businesses',
      headers: auth(owner),
      payload: { citySlug: 'salamiyah', name: 'مغسل السيارات الذهبي', vertical: 'services', description: 'غسيل سيارات متنقل' },
    });
    expect(created.statusCode).toBe(201);
    const business = created.json();
    expect(business.status).toBe('pending_review');

    const anonymous = await h.app.inject({ method: 'GET', url: `/api/v1/businesses/by-slug/${business.slug}` });
    expect(anonymous.statusCode).toBe(404);
    const asOwner = await h.app.inject({ method: 'GET', url: `/api/v1/businesses/by-slug/${business.slug}`, headers: auth(owner) });
    expect(asOwner.statusCode).toBe(200);

    expect((await h.app.inject({ method: 'GET', url: '/api/v1/admin/businesses', headers: auth(citizen) })).statusCode).toBe(403);
    const queue = await h.app.inject({ method: 'GET', url: '/api/v1/admin/businesses', headers: auth(admin) });
    expect(queue.json().map((b: { id: string }) => b.id)).toContain(business.id);

    const approve = await h.app.inject({
      method: 'PATCH',
      url: `/api/v1/admin/businesses/${business.id}/status`,
      headers: auth(admin),
      payload: { status: 'active' },
    });
    expect(approve.json()).toMatchObject({ status: 'active', isVerified: true });
    expect((await h.app.inject({ method: 'GET', url: `/api/v1/businesses/by-slug/${business.slug}` })).statusCode).toBe(200);

    await outboxRelay(h.app).drainOnce();
    const inbox = await h.app.inject({ method: 'GET', url: '/api/v1/me/notifications', headers: auth(owner) });
    expect(inbox.json()).toMatchObject({ unread: 1, items: [{ type: 'business.approved' }] });
  });

  it('logs searches asynchronously and surfaces zero-result demand to City Intelligence', async () => {
    const search = (q: string) =>
      h.app.inject({ method: 'GET', url: `/api/v1/search?city=salamiyah&q=${encodeURIComponent(q)}` }).then((r) => r.json<SearchResponse>());

    const hit = await search('بدي صيدلية مناوبة هلق');
    expect(hit.intent).toMatchObject({ intent: 'urgent', vertical: 'health', urgency: true });
    expect(hit.hits[0]).toMatchObject({ kind: 'business', item: { name: 'صيدلية الشفاء' } });

    const miss1 = await search('تصليح ساعات');
    const miss2 = await search('تَصليح ساعات!'); // same need, different spelling
    expect(miss1.total + miss2.total).toBe(0);

    // Drain the search-log queue the same way the worker does.
    const env = loadEnv();
    const connection = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });
    const queue = new Queue<SearchLogJob>(QUEUES.searchLog, { connection });
    const jobs = await queue.getJobs(['waiting', 'delayed', 'active']);
    expect(jobs.length).toBeGreaterThanOrEqual(3);
    const processors = new IngestionProcessors(h.app.get<Database>(DB), env);
    for (const job of jobs) await processors.persistSearch(job.data);
    for (const job of jobs) await processors.persistSearch(job.data); // retries are idempotent
    await processors.onApplicationShutdown();
    await queue.close();
    await connection.quit();

    const demand = await h.app.inject({
      method: 'GET',
      url: '/api/v1/admin/insights/demand?city=salamiyah&zeroOnly=true',
      headers: auth(admin),
    });
    expect(demand.json()).toEqual([expect.objectContaining({ normalizedQuery: 'تصليح ساعات', searches: 2, zeroResults: 2 })]);

    const kpis = await h.app.inject({ method: 'GET', url: '/api/v1/admin/insights/kpis?city=salamiyah', headers: auth(admin) });
    expect(kpis.json()).toMatchObject({ searches7d: 3, zeroResultRate7d: 0.667 });
  });

  it('runs the job board: post, apply once, review applicants', async () => {
    const employer = await loginAs(h.app, 'merchant');
    const job = await h.app.inject({
      method: 'POST',
      url: '/api/v1/jobs',
      headers: auth(employer),
      payload: { citySlug: 'salamiyah', title: 'نادل مسائي', description: 'مطلوب نادل لمطعم في وسط المدينة', employmentType: 'part_time' },
    });
    expect(job.statusCode).toBe(201);
    const id = job.json().id;

    const apply = () => h.app.inject({ method: 'POST', url: `/api/v1/jobs/${id}/applications`, headers: auth(citizen), payload: { message: 'لدي خبرة سنة' } });
    expect((await apply()).statusCode).toBe(201);
    expect((await apply()).json().error.code).toBe('ALREADY_APPLIED');

    expect((await h.app.inject({ method: 'GET', url: `/api/v1/jobs/${id}/applications`, headers: auth(citizen) })).statusCode).toBe(403);
    const applicants = await h.app.inject({ method: 'GET', url: `/api/v1/jobs/${id}/applications`, headers: auth(employer) });
    expect(applicants.json()).toEqual([expect.objectContaining({ name: 'أحمد محمد', phone: '+963900000005' })]);
  });

  it('aggregates reviews and blocks self-reviews', async () => {
    const list = await h.app.inject({ method: 'GET', url: '/api/v1/businesses?city=salamiyah&vertical=services&limit=50' });
    const target = list.json().items.find((b: { name: string }) => b.name === 'أبو سامر للسباكة');

    const review = (token: string, rating: number) =>
      h.app.inject({ method: 'PUT', url: `/api/v1/businesses/${target.id}/reviews/mine`, headers: auth(token), payload: { rating, body: 'خدمة ممتازة' } });
    expect((await review(citizen, 5)).statusCode).toBe(204);
    expect((await review(await login(h.app, '0911222333'), 3)).statusCode).toBe(204);
    expect((await review(citizen, 4)).statusCode).toBe(204); // edit, not a second review
    expect((await review(admin, 1)).statusCode).toBe(403); // admin owns this demo business

    const reviews = await h.app.inject({ method: 'GET', url: `/api/v1/businesses/${target.id}/reviews` });
    expect(reviews.json().items).toHaveLength(2);
    expect(reviews.json().items.map((r: { authorName: string }) => r.authorName)).toContain('أحمد م.');

    const page = await h.app.inject({ method: 'GET', url: `/api/v1/businesses?city=salamiyah&vertical=services&limit=50` });
    expect(page.json().items.find((b: { id: string }) => b.id === target.id)).toMatchObject({ ratingAvg: 3.5, ratingCount: 2 });
  });
});
