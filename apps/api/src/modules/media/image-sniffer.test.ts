import { describe, expect, it } from 'vitest';
import { sniffImage } from './image-sniffer';

describe('sniffImage', () => {
  it('detects real image signatures', () => {
    expect(sniffImage(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0]))?.extension).toBe('jpg');
    expect(sniffImage(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]))?.extension).toBe('png');
    expect(sniffImage(Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBPVP8 ')]))?.extension).toBe('webp');
  });

  it('rejects disguised files', () => {
    expect(sniffImage(Buffer.from('<svg onload="alert(1)"></svg>'))).toBeNull();
    expect(sniffImage(Buffer.from('<html><script>'))).toBeNull();
    expect(sniffImage(Buffer.alloc(0))).toBeNull();
  });
});
