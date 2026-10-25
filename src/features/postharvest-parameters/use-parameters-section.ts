'use client';

import { parseAsStringLiteral, useQueryState } from 'nuqs';

import type { SectionId } from './parameter-rows';

const SECTIONS = ['secado', 'alertas'] as const satisfies readonly SectionId[];

// La tarjeta que se ve, en la dirección (`?seccion=`): la pantalla trae 15 valores y juntos eran
// demasiado alto. Una dirección malformada cae en la primera.
export function useParametersSection() {
  return useQueryState(
    'seccion',
    parseAsStringLiteral(SECTIONS)
      .withDefault('secado')
      .withOptions({ clearOnDefault: true }),
  );
}
