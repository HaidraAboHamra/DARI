import { Body, Controller, Get, Patch } from '@nestjs/common';
import { type UpdateProfileInput, updateProfileSchema, type UserProfile } from '@dari/contracts';
import type { AuthUser } from '../../common/auth/auth-user';
import { CurrentUser } from '../../common/auth/decorators';
import { zod } from '../../common/validation/zod.pipe';
import { UsersService } from './users.service';

@Controller({ path: 'me', version: '1' })
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  me(@CurrentUser() user: AuthUser): Promise<UserProfile> {
    return this.users.getProfile(user.id);
  }

  @Patch()
  update(@CurrentUser() user: AuthUser, @Body(zod(updateProfileSchema)) body: UpdateProfileInput): Promise<UserProfile> {
    return this.users.updateProfile(user.id, body);
  }
}
