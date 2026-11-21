import { createContext } from 'react';

// Lo que cada entrada de la línea de tiempo sabe de su lugar en ella: el `id` con que se deja
// alcanzar desde el índice de etapas y si es la que se está leyendo en ese momento. Lo pone la pantalla,
// que conoce la posición de cada etapa, y lo lee la entrada, que es quien dibuja el elemento.
export type HistoryPosition = { anchorId?: string; active: boolean };

export const HistoryPositionContext = createContext<HistoryPosition>({
  active: false,
});

export const stageAnchorId = (index: number) => `etapa-${index}`;
