import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { Controller, Get, NotFoundException, Param, Post, Req, Res, VERSION_NEUTRAL } from '@nestjs/common';
import type { MediaUpload } from '@dari/contracts';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { AuthUser } from '../../common/auth/auth-user';
import { CurrentUser, Public } from '../../common/auth/decorators';
import { ValidationError } from '../../common/errors/app-error';
import { LocalDiskStorage } from '../../infrastructure/storage/local-disk.storage';
import { ObjectStorage } from '../../infrastructure/storage/object-storage';
import { MAX_UPLOAD_BYTES, MediaService } from './media.service';

const KEY = /^\d{4}\/\d{2}\/[0-9a-f-]{36}\.(jpg|png|webp)$/;
const TYPES: Record<string, string> = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };

@Controller({ version: VERSION_NEUTRAL })
export class MediaController {
  constructor(
    private readonly media: MediaService,
    private readonly storage: ObjectStorage,
  ) {}

  @Post('v1/media')
  async upload(@CurrentUser() user: AuthUser, @Req() req: FastifyRequest): Promise<MediaUpload> {
    if (!req.isMultipart()) throw new ValidationError('أرسل الصورة كـ multipart/form-data');
    const file = await req.file({ limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 } });
    if (!file) throw new ValidationError('لم يتم إرسال ملف');
    const bytes = await file.toBuffer().catch(() => {
      throw new ValidationError('الحد الأقصى لحجم الصورة 5 ميغابايت');
    });
    return this.media.uploadImage(user, bytes);
  }

  /** Serves files for the local driver only (S3 is served by its CDN). */
  @Public()
  @Get('media/:year/:month/:file')
  async serve(@Param('year') year: string, @Param('month') month: string, @Param('file') file: string, @Res() reply: FastifyReply): Promise<void> {
    const key = `${year}/${month}/${file}`;
    if (!(this.storage instanceof LocalDiskStorage) || !KEY.test(key)) throw new NotFoundException();
    const target = this.storage.resolve(key);
    const info = await stat(target).catch(() => null);
    if (!info) throw new NotFoundException();
    await reply
      .header('content-type', TYPES[file.split('.').pop()!]!)
      .header('content-length', info.size)
      .header('cache-control', 'public, max-age=31536000, immutable')
      .header('x-content-type-options', 'nosniff')
      // Public images are embedded by the website and apps on other origins (the global default is same-origin).
      .header('cross-origin-resource-policy', 'cross-origin')
      .send(createReadStream(target));
  }
}
