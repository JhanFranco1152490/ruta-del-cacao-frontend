'use client';

import { parseAsStringLiteral, useQueryState } from 'nuqs';

import type { SectionId } from './parameter-rows';

const SECTIONS = [
  'fermentacion',
  'secado',
  'alertas',
] as const satisfies readonly SectionId[];

// La tarjeta que se ve, en la dirección (`?seccion=`): la pantalla trae 21 valores y juntos eran
// demasiado alto. Una dirección malformada cae en la primera:
// la fermentación, que va primero en el proceso.
export function useParametersSection() {
  return useQueryState(
    'seccion',
    parseAsStringLiteral(SECTIONS)
      .withDefault('fermentacion')
      .withOptions({ clearOnDefault: true }),
  );
}
