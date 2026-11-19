import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { ObjectStorage } from './object-storage';

/** Development/single-node driver. Files are served by MediaController. */
export class LocalDiskStorage extends ObjectStorage {
  constructor(
    private readonly root: string,
    private readonly publicBase: string,
  ) {
    super();
  }

  async put(key: string, body: Buffer): Promise<void> {
    const target = this.resolve(key);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, body, { flag: 'wx' });
  }

  publicUrl(key: string): string {
    return `${this.publicBase}/media/${key}`;
  }

  /** Resolves a key inside the root; rejects path traversal. */
  resolve(key: string): string {
    const target = path.resolve(this.root, key);
    if (!target.startsWith(path.resolve(this.root) + path.sep)) throw new Error('invalid media key');
    return target;
  }
}
