import { Controller, Get, Param, Query } from '@nestjs/common';
import { type Area, type Category, type City, VERTICALS } from '@dari/contracts';
import { z } from 'zod';
import { Public } from '../../common/auth/decorators';
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

  @Get('cities/:slug/areas')
  areas(@Param('slug') slug: string): Promise<Area[]> {
    return this.cities.listAreas(slug);
  }

  @Get('categories')
  categories(@Query(zod(categoriesQuery)) q: z.infer<typeof categoriesQuery>): Promise<Category[]> {
    return this.cities.listCategories(q.vertical);
  }
}
