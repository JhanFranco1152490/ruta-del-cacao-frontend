'use client';

import type { MunicipalityCount } from '@/components/map/map-provider';

import { farmsLabel } from '../farm-count-label';

// Lo que muestra el mapa del departamento, en números: el total de fincas y las de cada municipio,
// de más a menos. Cada municipio es un botón que lleva el mapa a él. Solo cuenta lo que ya trae el
// mapa; lo demás de un resumen (hectáreas, estados) llegará con sus reportes.
export function FarmMapSummary({
  counts,
  municipalityName,
  onSelect,
}: {
  counts: readonly MunicipalityCount[];
  municipalityName: (code: string) => string;
  onSelect: (code: string) => void;
}) {
  const rows = counts
    .filter(({ count }) => count > 0)
    .map(({ code, count }) => ({ code, count, name: municipalityName(code) }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'es'));
  const total = rows.reduce((sum, { count }) => sum + count, 0);
  const max = rows[0]?.count ?? 0;

  return (
    <aside
      aria-label="Resumen de fincas"
      className="flex min-h-0 flex-col rounded-[var(--radius-card)] border border-border bg-card p-4 lg:h-80"
    >
      <p className="section-label">Resumen</p>
      <p className="mt-1 font-serif text-3xl text-selva">{farmsLabel(total)}</p>
      <p className="text-sm text-muted-foreground">
        {rows.length === 0
          ? 'Aún no hay fincas en el mapa.'
          : `en ${rows.length} ${rows.length === 1 ? 'municipio' : 'municipios'}`}
      </p>
      {rows.length > 0 && (
        <ul className="mt-3 max-h-64 min-h-0 flex-1 space-y-1 overflow-y-auto pr-1 lg:max-h-none">
          {rows.map(({ code, count, name }) => (
            <li key={code}>
              <button
                aria-label={`${name}: ${farmsLabel(count)}. Ver en el mapa`}
                className="w-full rounded-md px-2 py-1.5 text-left hover:bg-surface-alt focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-cobre"
                onClick={() => onSelect(code)}
                type="button"
              >
                <span className="flex items-baseline justify-between gap-3 text-sm font-bold text-selva">
                  <span>{name}</span>
                  <span className="tabular-nums">{count}</span>
                </span>
                <span
                  aria-hidden="true"
                  className="mt-1 block h-2 rounded-full bg-[var(--map-level-0)]"
                >
                  <span
                    className="block h-2 rounded-full bg-[var(--map-level-4)]"
                    style={{ width: `${(count / max) * 100}%` }}
                  />
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
