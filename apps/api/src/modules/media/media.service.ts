import { Inject, Injectable } from '@nestjs/common';
import type { MediaUpload } from '@dari/contracts';
import { v7 as uuidv7 } from 'uuid';
import type { AuthUser } from '../../common/auth/auth-user';
import { ValidationError } from '../../common/errors/app-error';
import { DB, type Database } from '../../infrastructure/database/database.module';
import { media } from '../../infrastructure/database/schema';
import { ObjectStorage } from '../../infrastructure/storage/object-storage';
import { sniffImage } from './image-sniffer';

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

@Injectable()
export class MediaService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly storage: ObjectStorage,
  ) {}

  async uploadImage(user: AuthUser, bytes: Buffer): Promise<MediaUpload> {
    if (!bytes.length) throw new ValidationError('الملف فارغ');
    if (bytes.length > MAX_UPLOAD_BYTES) throw new ValidationError('الحد الأقصى لحجم الصورة 5 ميغابايت');
    const image = sniffImage(bytes);
    if (!image) throw new ValidationError('الصيغ المدعومة: JPG, PNG, WEBP');

    const now = new Date();
    const id = uuidv7();
    const key = `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, '0')}/${id}.${image.extension}`;
    await this.storage.put(key, bytes, image.contentType);
    await this.db.insert(media).values({ id, ownerId: user.id, key, contentType: image.contentType, size: bytes.length });
    return { id, url: this.storage.publicUrl(key), contentType: image.contentType, size: bytes.length };
  }
}
