'use client';

import { useMunicipalityName } from '@/lib/api/municipalities';

import type { Farm } from '../api';
import { farmDifferences } from '../farm-differences';
import { farmToFormValues } from '../farm-queue';
import type { FarmContentField, FarmFormValues } from '../schemas';

const LABELS: Record<FarmContentField, string> = {
  name: 'Nombre',
  municipality_id: 'Municipio',
  details: 'Detalles',
  area_hectares: 'Área (ha)',
  altitude_masl: 'Altitud (m s. n. m.)',
  latitude: 'Latitud',
  longitude: 'Longitud',
};

export function FarmStaleVersionSummary({
  current,
  mine,
}: {
  current: Farm;
  mine: FarmFormValues;
}) {
  const municipalityName = useMunicipalityName();
  const differences = farmDifferences(farmToFormValues(current), mine);
  const show = (field: FarmContentField, value: string) =>
    field === 'municipality_id'
      ? municipalityName(value)
      : value.trim() || '(vacío)';

  if (!differences.length) {
    return (
      <p className="font-normal text-foreground">
        Alguien la modificó mientras tanto, pero hoy en el servidor tiene los
        mismos datos que tus cambios. Guarda para reenviarla.
      </p>
    );
  }

  return (
    <div className="space-y-2 font-normal text-foreground">
      <p>
        Alguien la modificó mientras tanto. Estos datos son distintos en el
        servidor; si guardas, quedarán como están en tu formulario:
      </p>
      <ul className="list-disc space-y-1 pl-5">
        {differences.map(({ field, server, mine: value }) => (
          <li key={field}>
            <strong>{LABELS[field]}:</strong> en el servidor{' '}
            <strong>{show(field, server)}</strong>, en tu formulario{' '}
            <strong>{show(field, value)}</strong>.
          </li>
        ))}
      </ul>
    </div>
  );
}
