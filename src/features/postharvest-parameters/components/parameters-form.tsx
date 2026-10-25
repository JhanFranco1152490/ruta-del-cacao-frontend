'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import { FormMessage } from '@/components/form-message';
import { MobileActionBar } from '@/components/mobile-action-bar';
import { SectionCard } from '@/components/page-blocks/section-card';
import { Button } from '@/components/ui/button';
import { notify } from '@/lib/notify';

import { type PostharvestParameters, useSaveParameters } from '../api';
import type { ParametersFormInput } from '../parameter-fields';
import { PARAMETER_SECTIONS } from '../parameter-rows';
import { saveFailureSummary } from '../parameters-errors';
import {
  baselineText,
  changedKeys,
  hasUnsavedChanges,
  parametersFormOf,
  parametersSchema,
  toParameterValues,
} from '../parameters-form';
import { ParameterInput } from './parameter-input';
import { ParameterRow } from './parameter-row';
import { ParametersResetDialog } from './parameters-reset-dialog';

// Los 15 valores como campos. Guardar se habilita con cambios y reemplaza los 15 a la vez; restablecer
// vuelve a la línea base. Cuando llegan valores nuevos (se guardó o los cambió otra persona), los
// campos se cargan con ellos.
export function ParametersForm({
  parameters,
  producer,
}: {
  parameters: PostharvestParameters;
  producer: string | null;
}) {
  const loaded = parametersFormOf(parameters.values);
  const form = useForm<ParametersFormInput, unknown, unknown>({
    resolver: zodResolver(parametersSchema),
    defaultValues: loaded,
  });
  const save = useSaveParameters(producer);
  const [summary, setSummary] = useState<string>();
  const current = useWatch({ control: form.control }) as ParametersFormInput;
  const { errors } = form.formState;
  const unsaved = hasUnsavedChanges(current, loaded);
  const changed = new Set(changedKeys(current, parameters.baseline));

  const { version, values } = parameters;
  useEffect(() => {
    form.reset(parametersFormOf(values));
  }, [version, values, form]);

  // Lo escrito ya pasó la validación: se envía como está, con coma o con punto.
  const submit = () => {
    setSummary(undefined);
    save.mutate(
      {
        expectedVersion: version,
        values: toParameterValues(form.getValues()),
      },
      {
        onSuccess: () => notify.success('Configuración guardada'),
        onError: (error) =>
          setSummary(saveFailureSummary(error, form.setError)),
      },
    );
  };

  return (
    <form
      className="space-y-4"
      noValidate
      onSubmit={(event) =>
        void form.handleSubmit(submit, () =>
          setSummary('Revisa los valores marcados.'),
        )(event)
      }
    >
      {summary && <FormMessage>{summary}</FormMessage>}
      {PARAMETER_SECTIONS.map((section) => (
        <SectionCard accent="cobre" key={section.id} title={section.title}>
          {section.rows.map((row) => (
            <ParameterRow
              description={row.description}
              key={row.id}
              title={row.title}
            >
              {row.fields.map(({ key, label }) => (
                <ParameterInput
                  baselineText={baselineText(key, parameters.baseline)}
                  changed={changed.has(key)}
                  disabled={save.isPending}
                  error={errors[key]?.message}
                  key={key}
                  label={label}
                  name={key}
                  register={form.register(key)}
                />
              ))}
            </ParameterRow>
          ))}
        </SectionCard>
      ))}
      <MobileActionBar>
        <Button
          className="w-full sm:w-auto"
          disabled={!unsaved || save.isPending}
          size="field"
          type="submit"
        >
          {save.isPending ? 'Guardando…' : 'Guardar cambios'}
        </Button>
        <Button
          className="w-full sm:w-auto"
          disabled={!unsaved || save.isPending}
          onClick={() => {
            form.reset(loaded);
            setSummary(undefined);
          }}
          size="field"
          type="button"
          variant="outline"
        >
          Descartar
        </Button>
      </MobileActionBar>
      {!parameters.is_default && (
        <ParametersResetDialog
          hasUnsavedChanges={unsaved}
          producer={producer}
          version={version}
        />
      )}
    </form>
  );
}
