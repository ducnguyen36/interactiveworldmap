import { describe, it, expect } from 'vitest';
import { dualText } from './dualText.js';

describe('dualText', () => {
  it('returns Vietnamese in vi mode', () => {
    expect(dualText('Việt Nam', 'Vietnam', 'vi')).toBe('Việt Nam');
  });
  it('returns English in en mode', () => {
    expect(dualText('Việt Nam', 'Vietnam', 'en')).toBe('Vietnam');
  });
  it('joins both in dual mode', () => {
    expect(dualText('Việt Nam', 'Vietnam', 'dual')).toBe('Việt Nam / Vietnam');
  });
  it('collapses dual when vi equals en', () => {
    expect(dualText('Fiji', 'Fiji', 'dual')).toBe('Fiji');
  });
  it('falls back to the other language when one is missing', () => {
    expect(dualText('', 'Vietnam', 'vi')).toBe('Vietnam');
    expect(dualText('Việt Nam', '', 'en')).toBe('Việt Nam');
    expect(dualText('', 'Vietnam', 'dual')).toBe('Vietnam');
  });
});
