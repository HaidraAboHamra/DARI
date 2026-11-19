import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ENV } from '../../config/config.module';
import type { Env } from '../../config/env';
import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';
import { OtpService } from './otp.service';
import { LoggingSmsGateway, SmsGateway } from './sms.gateway';
import { TokenService } from './token.service';

@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ENV],
      useFactory: (env: Env) => ({
        secret: env.JWT_SECRET,
        signOptions: { algorithm: 'HS256', issuer: 'dari' },
        verifyOptions: { algorithms: ['HS256'], issuer: 'dari' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    OtpService,
    TokenService,
    { provide: SmsGateway, useClass: LoggingSmsGateway },
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
  exports: [TokenService],
})
export class AuthModule {}
