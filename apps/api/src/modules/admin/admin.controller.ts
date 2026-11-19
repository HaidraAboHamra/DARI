import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { featureSchema, phoneSchema, type RecordPaymentInput, recordPaymentSchema, setRoleSchema, type Subscription, type UserProfile } from '@dari/contracts';
import { z } from 'zod';
import type { AuthUser } from '../../common/auth/auth-user';
import { CurrentUser, RequirePlatformRole } from '../../common/auth/decorators';
import { zod } from '../../common/validation/zod.pipe';
import { BusinessAccessService } from '../directory/business-access.service';
import { PlansService } from '../directory/plans.service';
import { AdminService } from './admin.service';

const phoneQuery = z.object({ phone: phoneSchema });

@Controller({ version: '1' })
export class AdminController {
  constructor(
    private readonly admin: AdminService,
    private readonly plans: PlansService,
    private readonly access: BusinessAccessService,
  ) {}

  @Get('merchant/businesses/:id/subscription')
  async subscription(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string): Promise<Subscription> {
    await this.access.require(user, id, 'orders.view');
    return this.plans.subscription(id);
  }

  @RequirePlatformRole('admin')
  @Post('admin/businesses/:id/payments')
  record(@CurrentUser() admin: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body(zod(recordPaymentSchema)) body: RecordPaymentInput) {
    return this.admin.recordPayment(admin, id, body);
  }

  @RequirePlatformRole('admin')
  @Get('admin/businesses/:id/payments')
  payments(@Param('id', ParseUUIDPipe) id: string) {
    return this.admin.payments(id);
  }

  @RequirePlatformRole('admin')
  @Get('admin/revenue')
  revenue() {
    return this.admin.revenueSummary();
  }

  @RequirePlatformRole('admin')
  @Patch('admin/businesses/:id/featured')
  featureBusiness(@CurrentUser() admin: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body(zod(featureSchema)) body: z.infer<typeof featureSchema>) {
    return this.admin.featureBusiness(admin, id, body.days);
  }

  @RequirePlatformRole('admin')
  @Patch('admin/listings/:id/featured')
  featureListing(@CurrentUser() admin: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body(zod(featureSchema)) body: z.infer<typeof featureSchema>) {
    return this.admin.featureListing(admin, id, body.days);
  }

  @RequirePlatformRole('admin')
  @Get('admin/users')
  findUser(@Query(zod(phoneQuery)) q: z.infer<typeof phoneQuery>): Promise<UserProfile> {
    return this.admin.findUserByPhone(q.phone);
  }

  @RequirePlatformRole('admin')
  @Patch('admin/users/:id/role')
  setRole(@CurrentUser() admin: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body(zod(setRoleSchema)) body: z.infer<typeof setRoleSchema>): Promise<UserProfile> {
    return this.admin.setRole(admin, id, body.role);
  }
}
