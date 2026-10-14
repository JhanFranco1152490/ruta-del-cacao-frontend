import { MAP_LEVELS } from './map-levels';

// Qué significan los tonos del mapa por municipios: sin nada, y de una a `max` (las cinco partes
// de cada tono son quintas del máximo). Es el mismo orden y los mismos colores que el mapa.
export function MapLevelLegend({ label, max }: { label: string; max: number }) {
  const levels = Array.from({ length: MAP_LEVELS }, (_, index) => index + 1);
  return (
    <div
      className="rounded-lg bg-card px-2 py-1.5 text-[11px] font-bold text-selva shadow-sm sm:px-3 sm:py-2 sm:text-xs"
      data-slot="map-legend"
    >
      <p className="mb-1 sm:mb-1.5">{label}</p>
      <div className="flex items-center gap-1.5">
        <span
          aria-hidden="true"
          className="h-2.5 w-4 rounded-sm border border-border sm:h-3 sm:w-5"
          style={{ background: 'var(--map-level-0)' }}
        />
        <span>Sin fincas</span>
      </div>
      <div className="mt-1 flex items-center gap-1">
        <span>1</span>
        {levels.map((level) => (
          <span
            aria-hidden="true"
            className="h-2.5 w-4 rounded-sm border border-border sm:h-3 sm:w-5"
            key={level}
            style={{ background: `var(--map-level-${level})` }}
          />
        ))}
        <span>{max}</span>
      </div>
    </div>
  );
}
