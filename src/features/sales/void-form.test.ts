import { describe, expect, it } from 'vitest';

import { REQUIRED_FIELD_MESSAGE } from '@/lib/validation/messages';

import { saleKilos, voidFormSchema } from './void-form';

const issueOf = (reason: string) =>
  voidFormSchema.safeParse({ reason }).error?.issues[0]?.message;

describe('voidFormSchema', () => {
  it('asks for a reason of up to 300 characters', () => {
    expect(issueOf('El comprador no recogió el cacao.')).toBeUndefined();
    expect(issueOf('   ')).toBe(REQUIRED_FIELD_MESSAGE);
    expect(issueOf('a'.repeat(301))).toBe('Máximo 300 caracteres.');
  });
});

describe('saleKilos', () => {
  it('adds the kilos of both grades without rounding errors', () => {
    expect(saleKilos({ g1_kg: '150.0', g2_kg: '40.0' })).toBe(190);
    expect(saleKilos({ g1_kg: '0.1', g2_kg: '0.2' })).toBe(0.3);
  });
});
