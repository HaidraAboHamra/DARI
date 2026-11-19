/**
 * Port for binary object storage. The app only knows keys and public URLs;
 * where bytes live (local disk, S3, R2, MinIO) is a deployment decision.
 */
export abstract class ObjectStorage {
  abstract put(key: string, body: Buffer, contentType: string): Promise<void>;
  abstract publicUrl(key: string): string;
}
