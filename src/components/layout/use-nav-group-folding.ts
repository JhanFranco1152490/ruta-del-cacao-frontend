'use client';

import { useCallback, useState } from 'react';

const STORAGE_KEY = 'nav-groups-folded';

// Lo que la persona decidió de cada grupo (true = plegado). Se lee al crear el estado, sin efecto,
// por la misma razón que la visibilidad de la barra: el marco solo se dibuja con la sesión ya
// cargada en el navegador. Un valor ajeno o un almacenamiento que lanza dejan los grupos como
// estén por defecto.
function readChoices(): Record<string, boolean> {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {};
    }
    return Object.fromEntries(
      Object.entries(parsed).filter(([, value]) => typeof value === 'boolean'),
    );
  } catch {
    return {};
  }
}

function storeChoices(choices: Record<string, boolean>) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(choices));
  } catch {
    // Solo se pierde el recuerdo entre visitas.
  }
}

// Qué grupos del menú están plegados. Lo que la persona eligió manda; si no ha elegido, los grupos
// empiezan plegados cuando el menú es largo (`foldByDefault`) y abiertos cuando cabe entero.
export function useNavGroupFolding(foldByDefault: boolean) {
  const [choices, setChoices] = useState(readChoices);

  const isFolded = useCallback(
    (group: string) => choices[group] ?? foldByDefault,
    [choices, foldByDefault],
  );

  const toggle = useCallback(
    (group: string) => {
      const next = { ...choices, [group]: !(choices[group] ?? foldByDefault) };
      setChoices(next);
      storeChoices(next);
    },
    [choices, foldByDefault],
  );

  return { isFolded, toggle };
}
