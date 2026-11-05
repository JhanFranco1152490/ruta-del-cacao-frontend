import { describe, expect, it } from 'vitest';

import { buildLotQuality } from '@/test/factories';

import { linkedActionOutcome } from './linked-action';

const ALL = { evaluate: true, classify: true, discard: true };
const lotIn = (status: 'dried' | 'evaluated' | 'classified') =>
  buildLotQuality({ lot: { ...buildLotQuality().lot, status } });

describe('linkedActionOutcome', () => {
  it('opens the form when the action still applies', () => {
    expect(linkedActionOutcome(lotIn('dried'), 'evaluar', ALL)).toEqual({
      open: true,
    });
  });

  it('says the lot already moved on', () => {
    expect(linkedActionOutcome(lotIn('evaluated'), 'evaluar', ALL)).toEqual({
      open: false,
      message: 'El lote ya está evaluado.',
    });
    expect(linkedActionOutcome(lotIn('classified'), 'corregir', ALL)).toEqual({
      open: false,
      message: 'El lote ya fue clasificado y no se puede corregir.',
    });
  });

  it('says the account may not do it', () => {
    expect(
      linkedActionOutcome(lotIn('evaluated'), 'descartar', {
        ...ALL,
        discard: false,
      }),
    ).toEqual({
      open: false,
      message: 'Tu cuenta no tiene permiso para hacer esto.',
    });
  });
});
