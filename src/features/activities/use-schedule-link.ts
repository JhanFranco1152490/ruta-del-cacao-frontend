'use client';

import { parseAsString, useQueryStates } from 'nuqs';
import { useEffect, useEffectEvent } from 'react';

import { isInternalPath } from '@/lib/navigation/origin';
import { notify } from '@/lib/notify';
import { SCHEDULE_MONITORING } from '@/lib/paths/activities';

export const SCHEDULE_FORBIDDEN_MESSAGE =
  'No tienes permiso para programar actividades';
export const SCHEDULE_OFFLINE_MESSAGE =
  'Necesitas conexión para programar una actividad';

// Programar una actividad que otra pantalla pide (`?programar=monitoreo`, el botón de Sanidad): con
// la finca y la parcela que ya se miraban (`finca`, `parcela`) y la pantalla a la que volver
// (`origen`). Los parámetros se atienden una vez y salen de la URL, para que recargar o volver al
// calendario no vuelva a abrir el formulario ni deje la lista filtrada por una finca que solo era
// un dato del formulario.
const parsers = {
  schedule: parseAsString,
  farm: parseAsString,
  plot: parseAsString,
  origin: parseAsString,
};
const urlKeys = {
  schedule: 'programar',
  farm: 'finca',
  plot: 'parcela',
  origin: 'origen',
};

export type ScheduleLink = {
  farmId?: string;
  plotId?: string;
  // La pantalla desde la que se pidió, si es una ruta de la app.
  origin: string | null;
};

export function useScheduleLink({
  ready,
  canSchedule,
  offline,
  onOpen,
}: {
  // La sesión y el calendario ya cargaron.
  ready: boolean;
  canSchedule: boolean;
  offline: boolean;
  // Abre el formulario con lo que pidió el enlace.
  onOpen: (link: ScheduleLink) => void;
}) {
  const [params, setParams] = useQueryStates(parsers, { urlKeys });

  const handle = useEffectEvent(() => {
    if (params.schedule !== SCHEDULE_MONITORING || !ready) return;
    void setParams({ schedule: null, farm: null, plot: null, origin: null });
    if (!canSchedule) return notify.warning(SCHEDULE_FORBIDDEN_MESSAGE);
    if (offline) return notify.warning(SCHEDULE_OFFLINE_MESSAGE);
    onOpen({
      farmId: params.farm || undefined,
      plotId: params.plot || undefined,
      origin: isInternalPath(params.origin) ? params.origin : null,
    });
  });
  useEffect(() => {
    handle();
  }, [params.schedule, ready]);
}
