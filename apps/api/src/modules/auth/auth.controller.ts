import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import {
  type AuthTokens,
  type RefreshTokenInput,
  refreshTokenSchema,
  type RequestOtpInput,
  requestOtpSchema,
  type VerifyOtpInput,
  verifyOtpSchema,
} from '@dari/contracts';
import type { AuthUser } from '../../common/auth/auth-user';
import { Client, type ClientMeta, CurrentUser, Public } from '../../common/auth/decorators';
import { zod } from '../../common/validation/zod.pipe';
import { UsersService } from '../users/users.service';
import { OtpService } from './otp.service';
import { TokenService } from './token.service';

@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(
    private readonly otp: OtpService,
    private readonly tokens: TokenService,
    private readonly users: UsersService,
  ) {}

  @Public()
  @Post('otp/request')
  @HttpCode(202)
  requestOtp(@Body(zod(requestOtpSchema)) body: RequestOtpInput, @Client() client: ClientMeta) {
    return this.otp.request(body.phone, client.ip);
  }

  @Public()
  @Post('otp/verify')
  @HttpCode(200)
  async verifyOtp(@Body(zod(verifyOtpSchema)) body: VerifyOtpInput, @Client() client: ClientMeta): Promise<AuthTokens> {
    await this.otp.verify(body.phone, body.code);
    const user = await this.users.findOrCreateByPhone(body.phone);
    return this.tokens.issue(user, { deviceName: body.deviceName ?? client.userAgent ?? undefined, ip: client.ip });
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  refresh(@Body(zod(refreshTokenSchema)) body: RefreshTokenInput, @Client() client: ClientMeta): Promise<AuthTokens> {
    return this.tokens.rotate(body.refreshToken, { ip: client.ip });
  }

  @Post('logout')
  @HttpCode(204)
  async logout(@CurrentUser() user: AuthUser): Promise<void> {
    await this.tokens.revoke(user.sessionId, user.id);
  }
}
