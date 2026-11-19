import { Module } from '@nestjs/common';
import { ENV } from '../../config/config.module';
import type { Env } from '../../config/env';
import { LocalDiskStorage } from '../../infrastructure/storage/local-disk.storage';
import { ObjectStorage } from '../../infrastructure/storage/object-storage';
import { S3Storage } from '../../infrastructure/storage/s3.storage';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';

@Module({
  controllers: [MediaController],
  providers: [
    MediaService,
    {
      provide: ObjectStorage,
      inject: [ENV],
      useFactory: (env: Env): ObjectStorage =>
        env.STORAGE_DRIVER === 's3'
          ? new S3Storage(env.S3_BUCKET!, env.S3_PUBLIC_URL!, env.S3_REGION, env.S3_ENDPOINT)
          : new LocalDiskStorage(env.UPLOAD_DIR, env.PUBLIC_API_URL),
    },
  ],
})
export class MediaModule {}
