import { Global, Module } from '@nestjs/common';
import { ENV } from '../../config/config.module';
import type { Env } from '../../config/env';
import { ExpoPushGateway, NoopPushGateway, PushGateway } from './push.gateway';

@Global()
@Module({
  providers: [
    {
      provide: PushGateway,
      inject: [ENV],
      useFactory: (env: Env): PushGateway => (env.PUSH_PROVIDER === 'expo' ? new ExpoPushGateway(env.EXPO_ACCESS_TOKEN) : new NoopPushGateway()),
    },
  ],
  exports: [PushGateway],
})
export class PushModule {}
