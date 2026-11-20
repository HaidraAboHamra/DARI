import { Module } from '@nestjs/common';
import { ENV } from '../../config/config.module';
import type { Env } from '../../config/env';
import { createObjectStorage } from '../../infrastructure/storage/create-storage';
import { ObjectStorage } from '../../infrastructure/storage/object-storage';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';

@Module({
  controllers: [MediaController],
  providers: [
    MediaService,
    {
      provide: ObjectStorage,
      inject: [ENV],
      useFactory: (env: Env): ObjectStorage => createObjectStorage(env),
    },
  ],
})
export class MediaModule {}
