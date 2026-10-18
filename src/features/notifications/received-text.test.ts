import { describe, expect, it } from 'vitest';

import { receivedText } from './received-text';

describe('receivedText', () => {
  const now = new Date('2026-10-20T17:00:00Z'); // 12:00 en Bogotá

  it('says how long ago it arrived today', () => {
    expect(receivedText('2026-10-20T16:59:40Z', now)).toBe('ahora');
    expect(receivedText('2026-10-20T16:35:00Z', now)).toBe('hace 25 min');
    expect(receivedText('2026-10-20T15:00:00Z', now)).toBe('hace 2 h');
    expect(receivedText('2026-10-20T05:05:00Z', now)).toBe('hoy');
  });

  it('says yesterday or the date before that, in Bogotá', () => {
    // 23:00 del 19 en Bogotá, aunque en UTC ya sea el 20.
    expect(receivedText('2026-10-20T04:00:00Z', now)).toBe('ayer');
    expect(receivedText('2026-10-14T12:00:00Z', now)).toBe('14 oct');
  });
});
