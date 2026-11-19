import { Inject, Injectable } from '@nestjs/common';
import type { ApplyJobInput, CreateJobInput, Job, JobApplication, ListJobsQuery, Page } from '@dari/contracts';
import { aliasedTable, and, desc, eq, gt, isNull, lt, or, type SQL, sql } from 'drizzle-orm';
import type { AuthUser } from '../../common/auth/auth-user';
import { ConflictError, ForbiddenError, NotFoundError } from '../../common/errors/app-error';
import { decodeCursor, toPage } from '../../common/pagination/cursor';
import { DB, DB_READ, type Database, type DbExecutor } from '../../infrastructure/database/database.module';
import { areas, businesses, jobApplications, jobs, users } from '../../infrastructure/database/schema';
import { CitiesService } from '../cities/cities.service';
import { BusinessAccessService } from '../directory/business-access.service';
import { buildSearchText } from '../directory/search-text';
import { OutboxService } from '../platform/outbox.service';

const area = aliasedTable(areas, 'area');
type JobRow = { job: typeof jobs.$inferSelect; businessName: string | null; areaName: string | null };

/** Local job board (blueprint §11.1). */
@Injectable()
export class JobsService {
  constructor(
    @Inject(DB) private readonly db: Database,
    @Inject(DB_READ) private readonly read: Database,
    private readonly cities: CitiesService,
    private readonly access: BusinessAccessService,
    private readonly outbox: OutboxService,
  ) {}

  async list(query: ListJobsQuery): Promise<Page<Job>> {
    const city = await this.cities.getBySlug(query.city);
    const conditions: SQL[] = [eq(jobs.cityId, city.id), ...openJobConditions()];
    if (query.employmentType) conditions.push(eq(jobs.employmentType, query.employmentType));
    const after = decodeCursor<[string]>(query.cursor, 1);
    if (after) conditions.push(lt(jobs.id, after[0]));
    const rows = await this.base(this.read).where(and(...conditions)).orderBy(desc(jobs.id)).limit(query.limit + 1);
    return toPage(rows, query.limit, toJob, (r) => [r.job.id]);
  }

  async get(id: string): Promise<Job> {
    const [row] = await this.base(this.read).where(eq(jobs.id, id)).limit(1);
    if (!row) throw new NotFoundError('الوظيفة');
    return toJob(row);
  }

  async create(user: AuthUser, input: CreateJobInput): Promise<Job> {
    const city = await this.cities.getBySlug(input.citySlug);
    if (input.businessId) await this.access.require(user, input.businessId, 'jobs.write');
    const [row] = await this.db
      .insert(jobs)
      .values({
        cityId: city.id,
        businessId: input.businessId ?? null,
        postedById: user.id,
        title: input.title,
        description: input.description,
        employmentType: input.employmentType,
        salaryMin: input.salaryMin ?? null,
        salaryMax: input.salaryMax ?? null,
        areaId: input.areaId ?? null,
        contactPhone: input.contactPhone ?? null,
        expiresAt: input.expiresAt ?? null,
        searchText: buildSearchText(input.title, input.description.slice(0, 500)),
      })
      .returning({ id: jobs.id });
    return this.get(row!.id);
  }

  async close(user: AuthUser, id: string): Promise<Job> {
    const [job] = await this.db.select().from(jobs).where(eq(jobs.id, id)).limit(1);
    if (!job) throw new NotFoundError('الوظيفة');
    await this.assertCanManage(user, job);
    await this.db.update(jobs).set({ status: 'closed' }).where(eq(jobs.id, id));
    return this.get(id);
  }

  async apply(user: AuthUser, jobId: string, input: ApplyJobInput): Promise<JobApplication> {
    const job = await this.get(jobId);
    const [open] = await this.db.select({ id: jobs.id, postedById: jobs.postedById }).from(jobs).where(and(eq(jobs.id, jobId), ...openJobConditions()));
    if (!open) throw new ConflictError('الوظيفة لم تعد متاحة', 'JOB_CLOSED');

    return this.db.transaction(async (tx) => {
      const [row] = await tx
        .insert(jobApplications)
        .values({ jobId, applicantId: user.id, message: input.message ?? null, phone: input.phone ?? null })
        .onConflictDoNothing({ target: [jobApplications.jobId, jobApplications.applicantId] })
        .returning();
      if (!row) throw new ConflictError('لقد تقدمت لهذه الوظيفة مسبقاً', 'ALREADY_APPLIED');
      await this.outbox.record(tx, {
        type: 'job.applied',
        aggregateId: row.id,
        payload: { jobId, postedById: open.postedById, title: job.title },
      });
      return { id: row.id, jobId, status: row.status, createdAt: row.createdAt.toISOString() };
    });
  }

  async applicants(user: AuthUser, jobId: string) {
    const [job] = await this.db.select().from(jobs).where(eq(jobs.id, jobId)).limit(1);
    if (!job) throw new NotFoundError('الوظيفة');
    await this.assertCanManage(user, job);
    return this.db
      .select({
        id: jobApplications.id,
        status: jobApplications.status,
        message: jobApplications.message,
        phone: sql<string>`coalesce(${jobApplications.phone}, ${users.phone})`,
        name: users.name,
        createdAt: jobApplications.createdAt,
      })
      .from(jobApplications)
      .innerJoin(users, eq(users.id, jobApplications.applicantId))
      .where(eq(jobApplications.jobId, jobId))
      .orderBy(desc(jobApplications.id));
  }

  private async assertCanManage(user: AuthUser, job: typeof jobs.$inferSelect): Promise<void> {
    if (job.postedById === user.id || user.role === 'admin') return;
    if (job.businessId) {
      await this.access.require(user, job.businessId, 'jobs.write');
      return;
    }
    throw new ForbiddenError();
  }

  private base(db: DbExecutor) {
    return db
      .select({ job: jobs, businessName: businesses.name, areaName: area.nameAr })
      .from(jobs)
      .leftJoin(businesses, eq(businesses.id, jobs.businessId))
      .leftJoin(area, eq(area.id, jobs.areaId));
  }
}

export function openJobConditions(): SQL[] {
  return [eq(jobs.status, 'open'), or(isNull(jobs.expiresAt), gt(jobs.expiresAt, sql`now()`))!];
}

export function toJob({ job, businessName, areaName }: JobRow): Job {
  return {
    id: job.id,
    title: job.title,
    description: job.description,
    employmentType: job.employmentType,
    salaryMin: job.salaryMin,
    salaryMax: job.salaryMax,
    businessName,
    areaName,
    contactPhone: job.contactPhone,
    publishedAt: job.createdAt.toISOString(),
    expiresAt: job.expiresAt?.toISOString() ?? null,
  };
}
