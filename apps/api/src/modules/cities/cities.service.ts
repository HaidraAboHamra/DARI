import { Inject, Injectable } from '@nestjs/common';
import type { Area, Category, City, Vertical } from '@dari/contracts';
import { asc, eq } from 'drizzle-orm';
import { NotFoundError } from '../../common/errors/app-error';
import { DB_READ, type Database } from '../../infrastructure/database/database.module';
import { areas, categories, cities, type CityConfig } from '../../infrastructure/database/schema';
import { CacheService } from '../../infrastructure/redis/cache.service';

export interface CityRecord extends City {
  config: CityConfig;
}

export interface CategoryWithKeywords extends Category {
  keywords: string[];
}

const TTL_SECONDS = 300;

/** City/area/category reference data. Read-mostly, served from cache. */
@Injectable()
export class CitiesService {
  constructor(
    @Inject(DB_READ) private readonly db: Database,
    private readonly cache: CacheService,
  ) {}

  async list(): Promise<City[]> {
    return this.cache.getOrSet('cities:active', TTL_SECONDS, async () => {
      const rows = await this.db.select().from(cities).where(eq(cities.isActive, true)).orderBy(asc(cities.nameAr));
      return rows.map(toCity);
    });
  }

  async getBySlug(slug: string): Promise<CityRecord> {
    const city = await this.cache.getOrSet(`city:slug:${slug}`, TTL_SECONDS, async () => {
      const [row] = await this.db.select().from(cities).where(eq(cities.slug, slug)).limit(1);
      return row && row.isActive ? { ...toCity(row), config: row.config } : null;
    });
    if (!city) throw new NotFoundError('المدينة');
    return city;
  }

  async getById(id: string): Promise<CityRecord> {
    const city = await this.cache.getOrSet(`city:id:${id}`, TTL_SECONDS, async () => {
      const [row] = await this.db.select().from(cities).where(eq(cities.id, id)).limit(1);
      return row ? { ...toCity(row), config: row.config } : null;
    });
    if (!city) throw new NotFoundError('المدينة');
    return city;
  }

  async listAreas(citySlug: string): Promise<Area[]> {
    const city = await this.getBySlug(citySlug);
    return this.cache.getOrSet(`city:${city.id}:areas`, TTL_SECONDS, async () => {
      const rows = await this.db.select().from(areas).where(eq(areas.cityId, city.id)).orderBy(asc(areas.nameAr));
      return rows.map((a) => ({ id: a.id, cityId: a.cityId, slug: a.slug, nameAr: a.nameAr }));
    });
  }

  async listCategories(vertical?: Vertical): Promise<Category[]> {
    const all = await this.categoryLexicon();
    return (vertical ? all.filter((c) => c.vertical === vertical) : all).map(({ keywords: _keywords, ...c }) => c);
  }

  /** Categories with their dialect keywords, consumed by the intent engine. */
  async categoryLexicon(): Promise<CategoryWithKeywords[]> {
    return this.cache.getOrSet('categories:all', TTL_SECONDS, async () => {
      const rows = await this.db.select().from(categories).orderBy(asc(categories.sortOrder));
      return rows.map((c) => ({
        id: c.id,
        vertical: c.vertical,
        slug: c.slug,
        nameAr: c.nameAr,
        parentId: c.parentId,
        keywords: c.keywords,
      }));
    });
  }
}

function toCity(row: typeof cities.$inferSelect): City {
  return {
    id: row.id,
    slug: row.slug,
    nameAr: row.nameAr,
    nameEn: row.nameEn,
    currency: row.currency,
    timezone: row.timezone,
  };
}
