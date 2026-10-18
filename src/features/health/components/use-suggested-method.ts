'use client';

import { useEffect, useRef } from 'react';
import { useFormContext } from 'react-hook-form';

import type { ControlMethod } from '../monitoring-rules';

// Precarga el control que el catálogo recomienda para la plaga de la detección. Solo toca el campo
// mientras la persona no lo haya cambiado: vacío, o con lo último que se puso aquí. Si la plaga
// cambia, la recomendación la acompaña; si la persona elige otra cosa, queda lo que eligió.
// `base` es dónde está el control en el formulario; el campo se monta cuando se elige hacer o
// programar el control, así que ahí empieza a aplicar.
export function useSuggestedMethod(
  base: string,
  suggested: ControlMethod | null,
) {
  const { getValues, setValue } = useFormContext();
  const applied = useRef('');
  useEffect(() => {
    const path = `${base}method`;
    const current = getValues(path) as string;
    if (current !== '' && current !== applied.current) return;
    const next = suggested ?? '';
    if (next !== current) setValue(path, next, { shouldDirty: true });
    applied.current = next;
  }, [base, suggested, getValues, setValue]);
}
