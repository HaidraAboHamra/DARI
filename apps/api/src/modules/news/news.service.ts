import { randomBytes } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import {
  type Article,
  type ContentStatus,
  type CreateArticleInput,
  createArticleSchema,
  type ListArticlesQuery,
  type Page,
  slugify,
} from '@dari/contracts';
import { and, desc, eq, lt, type SQL, sql } from 'drizzle-orm';
import type { AuthUser } from '../../common/auth/auth-user';
import { NotFoundError } from '../../common/errors/app-error';
import { decodeCursor, toPage } from '../../common/pagination/cursor';
import { DB, DB_READ, type Database } from '../../infrastructure/database/database.module';
import { articles } from '../../infrastructure/database/schema';
import { CitiesService } from '../cities/cities.service';
import { buildSearchText } from '../directory/search-text';
import { AuditService } from '../platform/audit.service';

type ArticleRow = typeof articles.$inferSelect;

/** City news & announcements, published by editors after local review (blueprint §11.2). */
@Injectable()
export class NewsService {
  constructor(
    @Inject(DB) private readonly db: Database,
    @Inject(DB_READ) private readonly read: Database,
    private readonly cities: CitiesService,
    private readonly audit: AuditService,
  ) {}

  async list(query: ListArticlesQuery): Promise<Page<Article>> {
    const city = await this.cities.getBySlug(query.city);
    const conditions: SQL[] = [eq(articles.cityId, city.id), eq(articles.status, 'published')];
    if (query.category) conditions.push(eq(articles.category, query.category));
    const after = decodeCursor<[string]>(query.cursor, 1);
    if (after) conditions.push(lt(articles.id, after[0]));
    const rows = await this.read
      .select()
      .from(articles)
      .where(and(...conditions))
      .orderBy(desc(articles.id))
      .limit(query.limit + 1);
    return toPage(rows, query.limit, toArticle, (r) => [r.id]);
  }

  async getPublished(slug: string): Promise<Article> {
    const [row] = await this.read
      .select()
      .from(articles)
      .where(and(eq(articles.slug, slug), eq(articles.status, 'published')))
      .limit(1);
    if (!row) throw new NotFoundError('الخبر');
    return toArticle(row);
  }

  async create(editor: AuthUser, input: CreateArticleInput): Promise<Article> {
    const data = createArticleSchema.parse(input);
    const city = await this.cities.getBySlug(data.citySlug);
    const [row] = await this.db
      .insert(articles)
      .values({
        cityId: city.id,
        authorId: editor.id,
        slug: `${slugify(data.title).slice(0, 60)}-${randomBytes(3).toString('hex')}`,
        title: data.title,
        summary: data.summary,
        body: data.body,
        category: data.category ?? null,
        coverUrl: data.coverUrl ?? null,
        status: data.status,
        publishedAt: data.status === 'published' ? new Date() : null,
        searchText: buildSearchText(data.title, data.summary, data.category),
      })
      .returning();
    return toArticle(row!);
  }

  async setStatus(editor: AuthUser, id: string, status: ContentStatus): Promise<Article> {
    const [row] = await this.db
      .update(articles)
      .set({ status, ...(status === 'published' && { publishedAt: sql`coalesce(${articles.publishedAt}, now())` }) })
      .where(eq(articles.id, id))
      .returning();
    if (!row) throw new NotFoundError('الخبر');
    await this.audit.record(this.db, { actorId: editor.id, action: 'article.status', entityType: 'article', entityId: id, changes: { status } });
    return toArticle(row);
  }
}

export function toArticle(row: ArticleRow): Article {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    body: row.body,
    category: row.category,
    coverUrl: row.coverUrl,
    status: row.status,
    publishedAt: row.publishedAt?.toISOString() ?? null,
  };
}
