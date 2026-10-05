import { formatHectares } from '@/lib/format/hectares';

import { formatAge, formatCount } from '../characterization-rules';

// Lo que sale de las siembras mientras se escriben: total, densidad y edad media.
export function CharacterizationTotals({
  trees,
  density,
  ageMonths,
  areaHectares,
}: {
  trees: number;
  density: number | null;
  ageMonths: number | null;
  areaHectares: string;
}) {
  return (
    <dl className="mt-5 grid gap-3 rounded-(--radius) bg-muted px-4 py-3 text-sm sm:grid-cols-3">
      <div>
        <dt className="text-muted-foreground">Total de árboles</dt>
        <dd className="text-lg font-bold">{formatCount(trees)}</dd>
      </div>
      <div>
        <dt className="text-muted-foreground">
          Densidad (sobre {formatHectares(areaHectares)})
        </dt>
        <dd className="text-lg font-bold">
          {density === null ? '—' : `${formatCount(density)} árboles/ha`}
        </dd>
      </div>
      <div>
        <dt className="text-muted-foreground">Edad media del cultivo</dt>
        <dd className="text-lg font-bold">
          {ageMonths === null ? '—' : formatAge(ageMonths)}
        </dd>
      </div>
    </dl>
  );
}
