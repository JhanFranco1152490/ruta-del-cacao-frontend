'use client';

import { useState } from 'react';

// Las flechas del teclado en el calendario: al salir del mes o de la semana pasan al vecino y
// dejan el foco en el día al que iban. En celular, el día también queda elegido en el mes.
export function useCalendarKeyboard({
  week,
  isDesktop,
  goToMonth,
  goPreviousWeek,
  goNextWeek,
  selectDay,
}: {
  week: string;
  isDesktop: boolean;
  goToMonth: (month: string) => void;
  goPreviousWeek: () => void;
  goNextWeek: () => void;
  selectDay: (date: string) => void;
}) {
  const [focusDate, setFocusDate] = useState<string>();
  return {
    focusDate,
    onFocusHandled: () => setFocusDate(undefined),
    onCrossMonth: (date: string) => {
      setFocusDate(date);
      goToMonth(date.slice(0, 7));
      if (!isDesktop) selectDay(date);
    },
    onCrossWeek: (date: string) => {
      setFocusDate(date);
      if (date < week) goPreviousWeek();
      else goNextWeek();
    },
  };
}
