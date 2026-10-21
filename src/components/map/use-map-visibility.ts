'use client';

import { useState } from 'react';

import { useIsDesktop } from '@/hooks/use-is-desktop';

export type MapVisibility = {
  visible: boolean;
  setVisible: (visible: boolean) => void;
};

// Si el mapa se ve. En el celular, con `hiddenOnMobile`, empieza oculto para que la lista quede
// más arriba; lo que la persona elige después manda. Quien dibuja el mapa y quien dibuja la lista
// de al lado lo comparten, porque al ocultarlo la lista cambia de forma.
export function useMapVisibility(hiddenOnMobile = false): MapVisibility {
  const isDesktop = useIsDesktop();
  const [chosen, setVisible] = useState<boolean>();
  return {
    visible: chosen ?? (hiddenOnMobile ? isDesktop : true),
    setVisible,
  };
}
