import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { type CityKpis, cursorQuerySchema, type CursorQuery, type DemandInsight } from '@dari/contracts';
import { z } from 'zod';
import type { AuthUser } from '../../common/auth/auth-user';
import { CurrentUser, RequirePlatformRole } from '../../common/auth/decorators';
import { zod } from '../../common/validation/zod.pipe';
import { InsightsService, type Opportunity } from './insights.service';

const cityQuery = z.object({
  city: z.string().trim().min(2).max(60),
  days: z.coerce.number().int().min(1).max(90).default(7),
  zeroOnly: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
});
type CityQuery = z.infer<typeof cityQuery>;

@Controller({ version: '1' })
export class InsightsController {
  constructor(private readonly insights: InsightsService) {}

  @RequirePlatformRole('admin')
  @Get('admin/insights/kpis')
  kpis(@Query(zod(cityQuery)) q: CityQuery): Promise<CityKpis> {
    return this.insights.cityKpis(q.city);
  }

  @RequirePlatformRole('admin')
  @Get('admin/insights/demand')
  demand(@Query(zod(cityQuery)) q: CityQuery): Promise<DemandInsight[]> {
    return this.insights.demand(q.city, q.days, q.zeroOnly);
  }

  @RequirePlatformRole('admin')
  @Get('admin/insights/opportunities')
  opportunities(@Query(zod(cityQuery)) q: CityQuery): Promise<Opportunity[]> {
    return this.insights.opportunities(q.city, q.days);
  }

  @Get('merchant/businesses/:id/insights')
  merchant(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.insights.merchantOverview(user, id);
  }

  @Get('merchant/businesses/:id/smart-insights')
  smart(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.insights.smartInsights(user, id);
  }

  @Get('merchant/businesses/:id/customers')
  customers(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Query(zod(cursorQuerySchema)) q: CursorQuery) {
    return this.insights.customers(user, id, q.cursor, q.limit);
  }
}
