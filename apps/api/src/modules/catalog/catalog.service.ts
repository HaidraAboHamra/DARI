import { Inject, Injectable } from '@nestjs/common';
import type { CreateProductInput, Product, UpdateProductInput } from '@dari/contracts';
import { createProductSchema } from '@dari/contracts';
import { and, asc, eq, isNull } from 'drizzle-orm';
import type { AuthUser } from '../../common/auth/auth-user';
import { NotFoundError } from '../../common/errors/app-error';
import { DB, DB_READ, type Database } from '../../infrastructure/database/database.module';
import { products } from '../../infrastructure/database/schema';
import { CacheService } from '../../infrastructure/redis/cache.service';
import { BusinessAccessService } from '../directory/business-access.service';
import { BusinessesService } from '../directory/businesses.service';
import { buildSearchText } from '../directory/search-text';

type ProductRow = typeof products.$inferSelect;
const MENU_TTL = 60;

/** Merchant catalog: products, menus, services with prices (blueprint §7.1). */
@Injectable()
export class CatalogService {
  constructor(
    @Inject(DB) private readonly db: Database,
    @Inject(DB_READ) private readonly read: Database,
    private readonly access: BusinessAccessService,
    private readonly businesses: BusinessesService,
    private readonly cache: CacheService,
  ) {}

  /** Public menu of an active business, cached and invalidated on every write. */
  async listPublic(businessId: string): Promise<Product[]> {
    await this.businesses.getActiveById(businessId);
    return this.cache.getOrSet(this.menuKey(businessId), MENU_TTL, async () => {
      const rows = await this.read
        .select()
        .from(products)
        .where(and(eq(products.businessId, businessId), isNull(products.deletedAt), eq(products.isAvailable, true)))
        .orderBy(asc(products.section), asc(products.sortOrder), asc(products.name));
      return rows.map(toProduct);
    });
  }

  async listForMerchant(user: AuthUser, businessId: string): Promise<Product[]> {
    await this.access.require(user, businessId, 'orders.view');
    const rows = await this.db
      .select()
      .from(products)
      .where(and(eq(products.businessId, businessId), isNull(products.deletedAt)))
      .orderBy(asc(products.section), asc(products.sortOrder), asc(products.name));
    return rows.map(toProduct);
  }

  async create(user: AuthUser, businessId: string, input: CreateProductInput): Promise<Product> {
    await this.access.require(user, businessId, 'catalog.write');
    const data = createProductSchema.parse(input);
    const [row] = await this.db
      .insert(products)
      .values({ ...data, businessId, searchText: buildSearchText(data.name, data.section, data.description) })
      .returning();
    await this.cache.invalidate(this.menuKey(businessId));
    return toProduct(row!);
  }

  async update(user: AuthUser, businessId: string, productId: string, input: UpdateProductInput): Promise<Product> {
    await this.access.require(user, businessId, 'catalog.write');
    const current = await this.findOwned(businessId, productId);
    const next = { ...current, ...input };
    const [row] = await this.db
      .update(products)
      .set({ ...input, searchText: buildSearchText(next.name, next.section, next.description) })
      .where(eq(products.id, productId))
      .returning();
    await this.cache.invalidate(this.menuKey(businessId));
    return toProduct(row!);
  }

  /** Soft delete: past orders keep referencing the product. */
  async remove(user: AuthUser, businessId: string, productId: string): Promise<void> {
    await this.access.require(user, businessId, 'catalog.write');
    await this.findOwned(businessId, productId);
    await this.db.update(products).set({ deletedAt: new Date(), isAvailable: false }).where(eq(products.id, productId));
    await this.cache.invalidate(this.menuKey(businessId));
  }

  invalidateMenu(businessId: string): Promise<void> {
    return this.cache.invalidate(this.menuKey(businessId));
  }

  private async findOwned(businessId: string, productId: string): Promise<ProductRow> {
    const [row] = await this.db
      .select()
      .from(products)
      .where(and(eq(products.id, productId), eq(products.businessId, businessId), isNull(products.deletedAt)))
      .limit(1);
    if (!row) throw new NotFoundError('المنتج');
    return row;
  }

  private menuKey(businessId: string): string {
    return `business:menu:${businessId}`;
  }
}

export function toProduct(row: ProductRow): Product {
  return {
    id: row.id,
    businessId: row.businessId,
    name: row.name,
    description: row.description,
    section: row.section,
    price: row.price,
    imageUrl: row.imageUrl,
    isAvailable: row.isAvailable,
    stock: row.stock,
    sortOrder: row.sortOrder,
  };
}
