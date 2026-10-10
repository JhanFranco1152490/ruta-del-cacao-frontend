'use client';

import { createParser, useQueryState } from 'nuqs';

import { isIsoMonth, shiftMonth, todayInBogota } from '@/lib/format/dates';

// Un mes malformado en la URL (?mes=zzz, ?mes=2026-13) cae al mes actual en vez de romper la lista.
const parseAsMonth = createParser({
  parse: (value) => (isIsoMonth(value) ? value : null),
  serialize: (value: string) => value,
});

// El mes que se ve vive en la URL (`?mes=2026-10`): se puede compartir y el botón atrás lo
// respeta. Sin parámetro es el mes actual, que no se escribe en la dirección.
export function useActivityMonth() {
  const [selected, setSelected] = useQueryState('mes', parseAsMonth);
  const today = todayInBogota();
  const currentMonth = today.slice(0, 7);
  const month = selected ?? currentMonth;
  const goTo = (target: string) =>
    setSelected(target === currentMonth ? null : target);

  return {
    month,
    today,
    isCurrentMonth: month === currentMonth,
    goPrevious: () => goTo(shiftMonth(month, -1)),
    goNext: () => goTo(shiftMonth(month, 1)),
    goToday: () => setSelected(null),
  };
}
