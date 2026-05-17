import { describe, expect, it } from 'vitest';
import { imgSrc } from '@/utils/imgSrc';

describe('imgSrc', () => {
  it('prefixes root-relative public assets with the configured base path', () => {
    expect(imgSrc('/drmn-logo.png', '/RMNDooh')).toBe('/RMNDooh/drmn-logo.png');
  });

  it('leaves absolute URLs unchanged', () => {
    expect(imgSrc('https://example.com/logo.png', '/RMNDooh')).toBe('https://example.com/logo.png');
  });
});
