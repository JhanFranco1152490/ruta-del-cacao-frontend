'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Pencil, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';

import { SelectField } from '@/components/select-field';
import { SubmitButton } from '@/components/submit-button';
import { TextAreaField } from '@/components/text-area-field';
import { TextField } from '@/components/text-field';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { getErrorMessage, isApiError } from '@/lib/api/errors';
import { applyApiFieldErrors } from '@/lib/api/form-errors';
import { normalizeCatalogName } from '@/lib/format/search';
import { notify } from '@/lib/notify';

import {
  DUPLICATE_PEST_DISEASE_CODE,
  type PestDisease,
  useCreatePestDisease,
  useUpdatePestDisease,
} from '../pest-api';
import { SAMPLING_UNITS } from '../monitoring-rules';
import { PEST_DISEASE_KIND_LABELS } from '../pest-filters';
import {
  createPestDiseaseFormSchema,
  DUPLICATE_PEST_DISEASE_MESSAGE,
  PEST_DISEASE_DESCRIPTION_MAX_LENGTH,
  PEST_DISEASE_NAME_MAX_LENGTH,
  type PestDiseaseFormInput,
  type PestDiseaseFormValues,
  SCIENTIFIC_NAME_MAX_LENGTH,
  SUGGESTED_METHOD_OPTIONS,
  toPestDiseaseRequest,
} from '../pest-schema';

const FIELDS = [
  'name',
  'kind',
  'scientific_name',
  'description',
  'suggested_sampling_unit',
  'suggested_control_method',
] as const;

// Registrar una plaga o enfermedad, o editar `item` si llega. `catalog` sirve para avisar de un
// nombre repetido antes de enviar; el servidor decide con todo el catálogo.
export function PestFormDialog({
  item,
  catalog,
}: {
  item?: PestDisease;
  catalog: readonly PestDisease[];
}) {
  const [open, setOpen] = useState(false);
  const create = useCreatePestDisease();
  const update = useUpdatePestDisease();
  const [failure, setFailure] = useState<string>();
  const isSaving = create.isPending || update.isPending;

  const schema = useMemo(
    () =>
      createPestDiseaseFormSchema(
        new Set(
          catalog
            .filter((other) => other.id !== item?.id)
            .map((other) => normalizeCatalogName(other.name)),
        ),
      ),
    [catalog, item?.id],
  );
  const currentValues = (): PestDiseaseFormInput => ({
    name: item?.name ?? '',
    kind: item?.kind ?? '',
    scientific_name: item?.scientific_name ?? '',
    description: item?.description ?? '',
    suggested_sampling_unit: item?.suggested_sampling_unit ?? '',
    // Una recomendación guardada como "Otro" (desde el admin) no se puede mostrar: queda vacía.
    suggested_control_method:
      item?.suggested_control_method &&
      item.suggested_control_method !== 'other'
        ? item.suggested_control_method
        : '',
  });
  const form = useForm<PestDiseaseFormInput, unknown, PestDiseaseFormValues>({
    resolver: zodResolver(schema),
    defaultValues: currentValues(),
  });
  const {
    register,
    formState: { errors },
  } = form;

  // Se reinicia al abrir, con lo vigente: una edición parte de lo último guardado y un registro
  // nuevo, vacío.
  const changeOpen = (next: boolean) => {
    if (isSaving) return;
    if (next) {
      form.reset(currentValues());
      setFailure(undefined);
    }
    setOpen(next);
  };

  const submit = async (values: PestDiseaseFormValues) => {
    setFailure(undefined);
    const body = toPestDiseaseRequest(values);
    try {
      if (item) await update.mutateAsync({ id: item.id, body });
      else await create.mutateAsync(body);
      // Directo y no con `changeOpen`: la mutación todavía figura en curso en este punto.
      setOpen(false);
      notify.success(
        item ? 'Cambios guardados' : 'Plaga o enfermedad registrada',
      );
    } catch (error) {
      if (isApiError(error) && error.code === DUPLICATE_PEST_DISEASE_CODE) {
        form.setError('name', {
          type: 'server',
          message: DUPLICATE_PEST_DISEASE_MESSAGE,
        });
        return;
      }
      const { applied, unmatched } = applyApiFieldErrors(error, form.setError, [
        ...FIELDS,
      ]);
      if (applied && unmatched.length === 0) return;
      setFailure(
        unmatched[0] ??
          getErrorMessage(
            error,
            'No fue posible guardar. Revisa tu conexión e inténtalo nuevamente.',
          ),
      );
    }
  };

  return (
    <Dialog onOpenChange={changeOpen} open={open}>
      <DialogTrigger
        render={
          item ? (
            <Button
              aria-label={`Editar ${item.name}`}
              className="h-11"
              variant="action"
            />
          ) : (
            <Button size="office" />
          )
        }
      >
        {item ? (
          <>
            <Pencil aria-hidden="true" className="size-4" /> Editar
          </>
        ) : (
          <>
            <Plus aria-hidden="true" className="size-4" /> Registrar plaga o
            enfermedad
          </>
        )}
      </DialogTrigger>
      <DialogContent showCloseButton={!isSaving}>
        <form
          className="space-y-4"
          noValidate
          onSubmit={(event) => {
            void form.handleSubmit(submit)(event);
          }}
        >
          <DialogHeader>
            <DialogTitle>
              {item ? `Editar ${item.name}` : 'Registrar plaga o enfermedad'}
            </DialogTitle>
            <DialogDescription>
              {item
                ? 'El cambio se ve en el buscador de los monitoreos nuevos; los ya registrados no cambian.'
                : 'Queda disponible en el buscador de la planilla del monitoreo.'}
            </DialogDescription>
          </DialogHeader>
          <TextField
            disabled={isSaving}
            error={errors.name?.message}
            hint="Como la conocen en campo. Por ejemplo, Monilia o Mazorca negra."
            label="Nombre"
            maxLength={PEST_DISEASE_NAME_MAX_LENGTH}
            {...register('name')}
          />
          <SelectField
            disabled={isSaving}
            error={errors.kind?.message}
            label="Tipo"
            placeholder="Elige el tipo"
            {...register('kind')}
          >
            {Object.entries(PEST_DISEASE_KIND_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </SelectField>
          <TextField
            disabled={isSaving}
            error={errors.scientific_name?.message}
            hint="Para buscarla en una guía o consultarla con un agrónomo."
            label="Nombre científico (opcional)"
            maxLength={SCIENTIFIC_NAME_MAX_LENGTH}
            {...register('scientific_name')}
          />
          <TextAreaField
            disabled={isSaving}
            error={errors.description?.message}
            hint="Empieza por lo que se ve y dónde, en palabras del capataz. Se muestra en el buscador de la planilla."
            label="Descripción"
            maxLength={PEST_DISEASE_DESCRIPTION_MAX_LENGTH}
            {...register('description')}
          />
          <SelectField
            disabled={isSaving}
            error={errors.suggested_sampling_unit?.message}
            hint="La planilla del monitoreo la propone al elegir esta plaga o enfermedad."
            label="Se suele evaluar en (opcional)"
            placeholder="Sin sugerencia"
            {...register('suggested_sampling_unit')}
          >
            {Object.entries(SAMPLING_UNITS).map(([value, { option }]) => (
              <option key={value} value={value}>
                {option}
              </option>
            ))}
          </SelectField>
          <SelectField
            disabled={isSaving}
            error={errors.suggested_control_method?.message}
            hint="Se precarga al elegir hacer o programar un control para esta plaga o enfermedad."
            label="Control recomendado (opcional)"
            placeholder="Sin recomendación"
            {...register('suggested_control_method')}
          >
            {SUGGESTED_METHOD_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </SelectField>
          {failure && (
            <p className="text-sm font-bold text-err" role="alert">
              {failure}
            </p>
          )}
          <DialogFooter>
            <DialogClose
              disabled={isSaving}
              render={<Button variant="outline" />}
            >
              Cancelar
            </DialogClose>
            {/* sm:w-auto: el pie va en fila desde `sm` y, a todo el ancho, empujaba a Cancelar fuera del
                diálogo. */}
            <SubmitButton
              className="sm:w-auto"
              pending={isSaving}
              pendingLabel="Guardando…"
            >
              {item ? 'Guardar cambios' : 'Registrar'}
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
