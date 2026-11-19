import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Put, Query } from '@nestjs/common';
import {
  type Connection,
  type Coupon,
  type CreateBroadcastInput,
  createBroadcastSchema,
  type CreateCouponInput,
  createCouponSchema,
  type Favorite,
  type FavoriteInput,
  favoriteSchema,
  validateCouponSchema,
} from '@dari/contracts';
import { z } from 'zod';
import type { AuthUser } from '../../common/auth/auth-user';
import { CurrentUser, Public } from '../../common/auth/decorators';
import { zod } from '../../common/validation/zod.pipe';
import { MarketingService } from './marketing.service';

const activeBody = z.object({ isActive: z.boolean() });

@Controller({ version: '1' })
export class MarketingController {
  constructor(private readonly marketing: MarketingService) {}

  @Post('businesses/:id/connect')
  @HttpCode(204)
  connect(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.marketing.connect(user, id);
  }

  @Delete('businesses/:id/connect')
  @HttpCode(204)
  disconnect(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.marketing.disconnect(user, id);
  }

  @Get('me/connections')
  connections(@CurrentUser() user: AuthUser): Promise<Connection[]> {
    return this.marketing.connections(user);
  }

  @Public()
  @Get('businesses/:id/offers')
  offers(@Param('id', ParseUUIDPipe) id: string): Promise<Coupon[]> {
    return this.marketing.publicOffers(id);
  }

  @Post('coupons/preview')
  @HttpCode(200)
  preview(@Body(zod(validateCouponSchema)) body: z.infer<typeof validateCouponSchema>) {
    return this.marketing.previewCoupon(body.businessId, body.code, body.subtotal);
  }

  @Get('merchant/businesses/:id/audience')
  audience(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.marketing.audienceSize(user, id);
  }

  @Get('merchant/businesses/:id/broadcasts')
  broadcasts(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.marketing.listBroadcasts(user, id);
  }

  @Post('merchant/businesses/:id/broadcasts')
  broadcast(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body(zod(createBroadcastSchema)) body: CreateBroadcastInput) {
    return this.marketing.broadcast(user, id, body);
  }

  @Get('merchant/businesses/:id/coupons')
  coupons(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string): Promise<Coupon[]> {
    return this.marketing.listCoupons(user, id);
  }

  @Post('merchant/businesses/:id/coupons')
  createCoupon(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body(zod(createCouponSchema)) body: CreateCouponInput): Promise<Coupon> {
    return this.marketing.createCoupon(user, id, body);
  }

  @Patch('merchant/businesses/:id/coupons/:couponId')
  @HttpCode(204)
  toggleCoupon(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('couponId', ParseUUIDPipe) couponId: string,
    @Body(zod(activeBody)) body: z.infer<typeof activeBody>,
  ): Promise<void> {
    return this.marketing.setCouponActive(user, id, couponId, body.isActive);
  }

  @Get('me/favorites')
  favorites(@CurrentUser() user: AuthUser): Promise<Favorite[]> {
    return this.marketing.listFavorites(user);
  }

  @Get('me/favorites/check')
  isFavorite(@CurrentUser() user: AuthUser, @Query(zod(favoriteSchema)) q: FavoriteInput): Promise<{ favorite: boolean }> {
    return this.marketing.isFavorite(user, q).then((favorite) => ({ favorite }));
  }

  @Put('me/favorites')
  @HttpCode(204)
  addFavorite(@CurrentUser() user: AuthUser, @Body(zod(favoriteSchema)) body: FavoriteInput): Promise<void> {
    return this.marketing.addFavorite(user, body);
  }

  @Delete('me/favorites')
  @HttpCode(204)
  removeFavorite(@CurrentUser() user: AuthUser, @Body(zod(favoriteSchema)) body: FavoriteInput): Promise<void> {
    return this.marketing.removeFavorite(user, body);
  }
}
