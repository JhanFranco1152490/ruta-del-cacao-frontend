import { KeyValue, KeyValues } from '@/components/page-blocks/section-card';

import type { ParameterValues } from '../parameter-fields';
import { PARAMETER_SECTIONS } from '../parameter-rows';
import { changedKeys, parametersFormOf, valueText } from '../parameters-form';
import { SectionCard } from '@/components/page-blocks/section-card';
import { useParametersSection } from '../use-parameters-section';
import { ChangedMark } from './changed-mark';
import { ParametersTabs } from './parameters-tabs';

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
  const [section, setSection] = useParametersSection();
  return (
    <>
      <ParametersTabs
        onSection={(next) => void setSection(next)}
        section={section}
      />
      {PARAMETER_SECTIONS.filter(({ id }) => id === section).map((shown) => (
        <SectionCard accent="cobre" key={shown.id} title={shown.title}>
          <KeyValues single>
            {shown.rows.map((row) => (
              <KeyValue key={row.id} label={row.title}>
                <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
                  {row.fields.map(({ key, label }) => (
                    <span className="inline-flex items-center gap-2" key={key}>
                      <span className="font-normal text-muted-foreground">
                        {label}
                      </span>
                      {valueText(key, values[key])}
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
