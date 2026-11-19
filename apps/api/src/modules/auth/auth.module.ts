import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ENV } from '../../config/config.module';
import type { Env } from '../../config/env';
import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';
import { OtpService } from './otp.service';
import { HttpSmsGateway, LoggingSmsGateway, SmsGateway, WhatsAppCloudGateway } from './sms.gateway';
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
    {
      provide: SmsGateway,
      inject: [ENV],
      useFactory: (env: Env): SmsGateway => {
        switch (env.SMS_PROVIDER) {
          case 'http':
            return new HttpSmsGateway(env.SMS_HTTP_URL!, env.SMS_HTTP_TOKEN, env.SMS_SENDER);
          case 'whatsapp':
            return new WhatsAppCloudGateway(env.WHATSAPP_PHONE_NUMBER_ID!, env.WHATSAPP_TOKEN!, env.WHATSAPP_OTP_TEMPLATE);
          default:
            return new LoggingSmsGateway();
        }
      },
    },
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
  exports: [TokenService],
})
export class AuthModule {}
