'use client';

import { type ComponentType, useEffect, useState } from 'react';

type ProviderState<P> = {
  attempt: number;
  // Dentro de un objeto: pasar el componente solo a setState lo tomaría como función de
  // actualización.
  Provider?: ComponentType<P>;
  failed?: boolean;
};

// Carga diferida del mapa real, con reintento. `load` debe ser una referencia estable (una
// constante de módulo): cambiarla vuelve a cargar el mapa.
export function useMapProvider<P>(load: () => Promise<ComponentType<P>>) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<ProviderState<P>>({ attempt: -1 });

  useEffect(() => {
    let cancelled = false;
    load().then(
      (Provider) => {
        if (!cancelled) setState({ attempt, Provider });
      },
      () => {
        if (!cancelled) setState({ attempt, failed: true });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [attempt, load]);

  return {
    isLoading: state.attempt !== attempt,
    Provider: state.failed ? undefined : state.Provider,
    retry: () => setAttempt((current) => current + 1),
    // El mapa cargó pero dejó de funcionar (p. ej. sin mapa base): se ofrece reintentar.
    fail: () => setState({ attempt, failed: true }),
  };
}
