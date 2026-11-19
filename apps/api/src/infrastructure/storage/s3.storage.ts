import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { ObjectStorage } from './object-storage';

/** Production driver for S3 and S3-compatible stores (R2, MinIO). Serve via CDN. */
export class S3Storage extends ObjectStorage {
  private readonly client: S3Client;

  constructor(
    private readonly bucket: string,
    private readonly publicBase: string,
    region: string,
    endpoint?: string,
  ) {
    super();
    this.client = new S3Client({ region, ...(endpoint && { endpoint, forcePathStyle: true }) });
  }

  async put(key: string, body: Buffer, contentType: string): Promise<void> {
    await this.client.send(
      new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: body, ContentType: contentType, CacheControl: 'public, max-age=31536000, immutable' }),
    );
  }

  publicUrl(key: string): string {
    return `${this.publicBase.replace(/\/$/, '')}/${key}`;
  }
}
