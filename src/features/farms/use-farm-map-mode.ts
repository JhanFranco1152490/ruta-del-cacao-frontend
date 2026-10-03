'use client';

import { createParser, useQueryState } from 'nuqs';

export type FarmMapMode = 'municipalities' | 'free';

// En la URL va en español, como los demás parámetros. Un valor desconocido es "sin elegir".
const URL_VALUES: Record<FarmMapMode, string> = {
  municipalities: 'municipios',
  free: 'libre',
};

const modeParser = createParser<FarmMapMode>({
  parse: (value) =>
    (Object.keys(URL_VALUES) as FarmMapMode[]).find(
      (mode) => URL_VALUES[mode] === value,
    ) ?? null,
  serialize: (mode) => URL_VALUES[mode],
});

// La vista del mapa vive en la URL (`?vista=`), como los filtros: sobrevive a recargar y se
// comparte. Sin elegir, la asociación ve muchas fincas y abre por municipios; un productor tiene
// pocas y abre el mapa libre.
export function useFarmMapMode(isAssociation: boolean) {
  const [chosen, setChosen] = useQueryState('vista', modeParser);
  return {
    mode: chosen ?? (isAssociation ? 'municipalities' : 'free'),
    setMode: (mode: FarmMapMode) => void setChosen(mode),
  } as const;
}
