import { describe, expect, it } from 'vitest';

import { bellCount, bellLabel } from './bell-text';

describe('the bell', () => {
  it('counts up to nine and then says 9+', () => {
    expect(bellCount(0)).toBe('0');
    expect(bellCount(9)).toBe('9');
    expect(bellCount(10)).toBe('9+');
  });

  it('says how many are unread', () => {
    expect(bellLabel(0)).toBe('Notificaciones');
    expect(bellLabel(1)).toBe('Notificaciones, 1 sin leer');
    expect(bellLabel(12)).toBe('Notificaciones, 12 sin leer');
  });
});
