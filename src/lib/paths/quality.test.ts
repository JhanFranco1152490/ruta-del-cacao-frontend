import { describe, expect, it } from 'vitest';

import { QUALITY_PATH, qualityActionPath } from './quality';

describe('qualityActionPath', () => {
  it('opens the quality screen with the lot and the action', () => {
    expect(qualityActionPath('l1', 'evaluar')).toBe(
      `${QUALITY_PATH}?lote=l1&accion=evaluar`,
    );
  });

  it('escapes the lot id', () => {
    expect(qualityActionPath('a b', 'descartar')).toBe(
      '/calidad?lote=a+b&accion=descartar',
    );
  });
});
