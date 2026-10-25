import { KeyValue, KeyValues } from '@/components/page-blocks/section-card';
import { formatDecimal } from '@/lib/format/decimal';

import { unitOf } from '../parameter-fields';
import type { ParameterValues } from '../parameter-fields';
import { PARAMETER_SECTIONS } from '../parameter-rows';
import { changedKeys, parametersFormOf } from '../parameters-form';
import { SectionCard } from '@/components/page-blocks/section-card';
import { ChangedMark } from './changed-mark';

// Los parámetros como datos, para quien solo consulta o no tiene conexión: cada parámetro con su
// valor y su unidad, y la marca «Cambiado» si no es la línea base.
export function ParametersReadonly({
  values,
  baseline,
}: {
  values: ParameterValues;
  baseline: ParameterValues;
}) {
  const changed = new Set(changedKeys(parametersFormOf(values), baseline));
  return (
    <>
      {PARAMETER_SECTIONS.map((section) => (
        <SectionCard accent="cobre" key={section.id} title={section.title}>
          <KeyValues single>
            {section.rows.map((row) => (
              <KeyValue key={row.id} label={row.title}>
                <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
                  {row.fields.map(({ key, label }) => (
                    <span className="inline-flex items-center gap-2" key={key}>
                      <span className="font-normal text-muted-foreground">
                        {label}
                      </span>
                      {formatDecimal(values[key], 1)} {unitOf(key)}
                      {changed.has(key) && <ChangedMark />}
                    </span>
                  ))}
                </span>
              </KeyValue>
            ))}
          </KeyValues>
        </SectionCard>
      ))}
    </>
  );
}
