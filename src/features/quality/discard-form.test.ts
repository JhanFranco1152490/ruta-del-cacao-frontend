import { describe, expect, it } from 'vitest';

import {
  DISCARD_CONFIRM_DESCRIPTION,
  discardConfirmTitle,
  discardFormSchema,
  toDiscardRequest,
} from './discard-form';
import { discardReasonText } from '@/lib/discard-reasons';

import { DISCARD_REASON_OPTIONS } from './discard-reasons';

const errorsOf = (reason: string, detail = '') => {
  const result = discardFormSchema.safeParse({ reason, detail });
  return result.success
    ? {}
    : Object.fromEntries(
        result.error.issues.map((issue) => [issue.path[0], issue.message]),
      );
};

describe('discardFormSchema', () => {
  it('asks for the reason', () => {
    expect(errorsOf('')).toEqual({ reason: 'Indique el motivo del descarte' });
  });

  it('asks for the detail only with Otro', () => {
    expect(errorsOf('other', '  ')).toEqual({
      detail: 'Describa el motivo del descarte',
    });
    expect(errorsOf('mold')).toEqual({});
  });

  it('limits the detail to 300 characters', () => {
    expect(errorsOf('mold', 'a'.repeat(301))).toEqual({
      detail: 'Máximo 300 caracteres.',
    });
  });
});

describe('discard texts', () => {
  it('lists the six reasons in order', () => {
    expect(DISCARD_REASON_OPTIONS.map(({ label }) => label)).toEqual([
      'Moho',
      'Fermentación insuficiente',
      'Sobrefermentado',
      'Daño por insectos',
      'Contaminación (humo, olores, químicos)',
      'Otro (con detalle)',
    ]);
  });

  it('reads Otro as what was written', () => {
    expect(discardReasonText('mold', 'ignorado')).toBe('Moho');
    expect(discardReasonText('other', 'Granos germinados')).toBe(
      'Granos germinados',
    );
    expect(discardReasonText('other')).toBe('Otro');
  });

  it('asks to confirm with the code of the lot', () => {
    expect(discardConfirmTitle('000123-F02-P05-261014-1')).toBe(
      '¿Descartar el lote 000123-F02-P05-261014-1?',
    );
    expect(DISCARD_CONFIRM_DESCRIPTION).toBe(
      'Esta acción no se puede deshacer. El lote no podrá clasificarse, ingresar a bodega ni venderse.',
    );
  });

  it('sends the lot version with the reason', () => {
    expect(toDiscardRequest({ reason: 'mold', detail: '' }, 5)).toEqual({
      expected_lot_version: 5,
      reason: 'mold',
      detail: '',
    });
  });
});
