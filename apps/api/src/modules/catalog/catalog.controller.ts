import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import {
  type CreateProductInput,
  createProductSchema,
  type Product,
  type UpdateProductInput,
  updateProductSchema,
} from '@dari/contracts';
import { z } from 'zod';
import type { AuthUser } from '../../common/auth/auth-user';
import { CurrentUser, Public } from '../../common/auth/decorators';
import { zod } from '../../common/validation/zod.pipe';
import { CatalogService } from './catalog.service';

const importBody = z.object({ rows: z.array(z.unknown()).min(1).max(500) });

@Controller({ version: '1' })
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Public()
  @Get('businesses/:id/products')
  menu(@Param('id', ParseUUIDPipe) businessId: string): Promise<Product[]> {
    return this.catalog.listPublic(businessId);
  }

  @Get('merchant/businesses/:id/products')
  list(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) businessId: string): Promise<Product[]> {
    return this.catalog.listForMerchant(user, businessId);
  }

  @Post('merchant/businesses/:id/products')
  create(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) businessId: string,
    @Body(zod(createProductSchema)) body: CreateProductInput,
  ): Promise<Product> {
    return this.catalog.create(user, businessId, body);
  }

  @Post('merchant/businesses/:id/products/import')
  import(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) businessId: string, @Body(zod(importBody)) body: z.infer<typeof importBody>) {
    return this.catalog.importMany(user, businessId, body.rows);
  }

  @Patch('merchant/businesses/:id/products/:productId')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) businessId: string,
    @Param('productId', ParseUUIDPipe) productId: string,
    @Body(zod(updateProductSchema)) body: UpdateProductInput,
  ): Promise<Product> {
    return this.catalog.update(user, businessId, productId, body);
  }

  @Delete('merchant/businesses/:id/products/:productId')
  @HttpCode(204)
  remove(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) businessId: string,
    @Param('productId', ParseUUIDPipe) productId: string,
  ): Promise<void> {
    return this.catalog.remove(user, businessId, productId);
  }
}
