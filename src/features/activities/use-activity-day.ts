'use client';

import { useQueryState } from 'nuqs';

import { parseAsIsoDate } from './iso-date-parser';

// El día elegido en el mes de un celular vive en la URL (`?dia=2026-10-13`). Sin día, o con uno de
// otro mes, es hoy si hoy está en el mes que se ve, y si no, el primero del mes; ese día "de
// siempre" no se escribe en la dirección.
export function useActivityDay(month: string, today: string) {
  const [selected, setSelected] = useQueryState('dia', parseAsIsoDate);
  const fallback = today.startsWith(month) ? today : `${month}-01`;
  const day = selected?.startsWith(month) ? selected : fallback;

  return {
    day,
    setDay: (date: string) => setSelected(date === fallback ? null : date),
  };
}
