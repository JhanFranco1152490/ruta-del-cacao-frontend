import { describe, expect, it } from 'vitest';

import {
  VOID_REASON_REQUIRED_MESSAGE,
  voidFormSchema,
  voidQuestion,
} from './void-form';

describe('voidFormSchema', () => {
  it('asks for the reason, up to 300 characters', () => {
    const message = (reason: string) =>
      voidFormSchema.safeParse({ reason }).error?.issues[0].message;
    expect(message('  ')).toBe(VOID_REASON_REQUIRED_MESSAGE);
    expect(message('x'.repeat(301))).toBe('Máximo 300 caracteres.');
    expect(message('Se escribió 50 en vez de 5')).toBeUndefined();
  });
});

describe('voidQuestion', () => {
  it('says how much and of which grade', () => {
    expect(voidQuestion({ quantity_kg: '5.0', grade: 'g1' })).toBe(
      '¿Anular la salida de 5,0 kg de G1?',
    );
  });
});
