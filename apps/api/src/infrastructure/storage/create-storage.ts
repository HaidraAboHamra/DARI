import type { Env } from '../../config/env';
import { LocalDiskStorage } from './local-disk.storage';
import type { ObjectStorage } from './object-storage';
import { S3Storage } from './s3.storage';

/** The configured storage driver (used by the API and by seed scripts). */
export function createObjectStorage(env: Env): ObjectStorage {
  return env.STORAGE_DRIVER === 's3'
    ? new S3Storage(env.S3_BUCKET!, env.S3_PUBLIC_URL!, env.S3_REGION, env.S3_ENDPOINT)
    : new LocalDiskStorage(env.UPLOAD_DIR, env.PUBLIC_API_URL);
}
