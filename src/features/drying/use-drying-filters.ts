'use client';

import { parseAsString, parseAsStringLiteral, useQueryStates } from 'nuqs';

export const DRYING_VIEWS = ['en-secado', 'listos'] as const;
export type DryingView = (typeof DRYING_VIEWS)[number];

// Una pestaña malformada (?vista=todas) cae a la de los lotes en secado.
const parsers = {
  view: parseAsStringLiteral(DRYING_VIEWS).withDefault('en-secado'),
  farm: parseAsString,
  producer: parseAsString,
  // Los enlaces desde Lotes: el lote cuyo formulario de iniciar o finalizar se abre al llegar.
  start: parseAsString,
  finish: parseAsString,
};

// En la URL los parámetros van en español, como las rutas.
const urlKeys = {
  view: 'vista',
  farm: 'finca',
  producer: 'productor',
  start: 'iniciar',
  finish: 'finalizar',
};

export function useDryingFilters() {
  const [params, setParams] = useQueryStates(parsers, {
    urlKeys,
    clearOnDefault: true,
  });

  return {
    view: params.view,
    // Vacíos en la URL son «todas las fincas» y «sin elegir».
    farm: params.farm || null,
    // Solo lo usa la cuenta técnica.
    producer: params.producer || null,
    startLotId: params.start || null,
    finishLotId: params.finish || null,
    clearStart: () => setParams({ start: null }),
    clearFinish: () => setParams({ finish: null }),
    // Cambiar de pestaña conserva la finca: se mira lo mismo en la otra lista.
    setView: (view: DryingView) => setParams({ view }),
    setFarm: (farm: string | null) => setParams({ farm }),
    clear: () => setParams({ farm: null }),
    // La finca elegida era de otro productor.
    setProducer: (producer: string | null) =>
      setParams({ producer, farm: null }),
  };
}
