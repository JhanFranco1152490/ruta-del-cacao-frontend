'use client';

import { liveQuery } from 'dexie';
import { useEffect, useEffectEvent, useState } from 'react';

// Lo que `read` lee de la base del dispositivo, leído de nuevo cada vez que cambia. `key` nombra la
// lectura (la persona y lo que se pide): mientras llega la de una nueva no se devuelve la anterior,
// que puede ser de otra persona que usó el equipo. Sin `key` (sin sesión) no se lee nada. Si no se
// puede leer, `fallback`.
export function useLiveRead<T>(
  key: string | undefined,
  read: () => Promise<T>,
  fallback: T,
): T | undefined {
  const [state, setState] = useState<{ key?: string; value?: T }>({});
  const readNow = useEffectEvent(read);
  const fallbackNow = useEffectEvent(() => fallback);

  useEffect(() => {
    if (!key) return;
    const subscription = liveQuery(() => readNow()).subscribe({
      next: (value) => setState({ key, value }),
      error: () => setState({ key, value: fallbackNow() }),
    });
    return () => subscription.unsubscribe();
  }, [key]);

  return key && state.key === key ? state.value : undefined;
}
