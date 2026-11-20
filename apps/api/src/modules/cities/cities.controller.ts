import { Body, Controller, Get, Param, Put, Query } from '@nestjs/common';
import { type Area, type Category, type City, type DeliveryPricing, deliveryPricingSchema, VERTICALS } from '@dari/contracts';
import { z } from 'zod';
import { Public, RequirePlatformRole } from '../../common/auth/decorators';
import { zod } from '../../common/validation/zod.pipe';
import { CitiesService } from './cities.service';

const categoriesQuery = z.object({ vertical: z.enum(VERTICALS).optional() });

@Public()
@Controller({ version: '1' })
export class CitiesController {
  constructor(private readonly cities: CitiesService) {}

  @Get('cities')
  list(): Promise<City[]> {
    return this.cities.list();
  }

  @Get('cities/:slug')
  async get(@Param('slug') slug: string): Promise<City> {
    const { config: _config, ...city } = await this.cities.getBySlug(slug);
    return city;
  }

  /** Pricing rules so apps can preview a fee; the server always re-prices at checkout. */
  @Get('cities/:slug/delivery-pricing')
  deliveryPricing(@Param('slug') slug: string): Promise<DeliveryPricing> {
    return this.cities.deliveryPricing(slug);
  }

  @Get('cities/:slug/areas')
  areas(@Param('slug') slug: string): Promise<Area[]> {
    return this.cities.listAreas(slug);
  }

  @Get('categories')
  categories(@Query(zod(categoriesQuery)) q: z.infer<typeof categoriesQuery>): Promise<Category[]> {
    return this.cities.listCategories(q.vertical);
  }
}

/** Admin-only city settings. */
@Controller({ version: '1' })
export class CityAdminController {
  constructor(private readonly cities: CitiesService) {}

  @RequirePlatformRole('admin')
  @Put('admin/cities/:slug/delivery-pricing')
  setDeliveryPricing(@Param('slug') slug: string, @Body(zod(deliveryPricingSchema)) body: DeliveryPricing): Promise<DeliveryPricing> {
    return this.cities.setDeliveryPricing(slug, body);
  }
}
