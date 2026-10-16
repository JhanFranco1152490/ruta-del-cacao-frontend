'use client';

import { createContext, useContext } from 'react';

import type { SearchSelectOption } from '@/components/search-select';
import type { CatalogInput } from '@/lib/input-usage';

// Lo que necesita el control de cada detección y no cambia entre detecciones: si quien registra
// puede programar, los insumos que puede registrar como gastados, a quién se le puede asignar en la
// finca y la fecha de hoy. Lo entrega la planilla.
export type ControlChoices = {
  canSchedule: boolean;
  catalog: readonly CatalogInput[] | undefined;
  stocks: ReadonlyMap<string, string> | undefined;
  assignees: readonly SearchSelectOption[];
  // El nombre de cada responsable ofrecido, sin la marca "(tú)" de la lista.
  assigneeNames: ReadonlyMap<string, string>;
  today: string;
};

export const ControlChoicesContext = createContext<ControlChoices>({
  canSchedule: false,
  catalog: undefined,
  stocks: undefined,
  assignees: [],
  assigneeNames: new Map(),
  today: '',
});

export const useControlChoices = () => useContext(ControlChoicesContext);
