'use client';

import {
  CatalogItemDialog,
  useCatalogItemForm,
} from '@/components/catalog-item-dialog';
import { SelectField } from '@/components/select-field';
import { TextAreaField } from '@/components/text-area-field';
import { TextField } from '@/components/text-field';
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

const valuesOf = (item?: PestDisease): PestDiseaseFormInput => ({
  name: item?.name ?? '',
  kind: item?.kind ?? '',
  scientific_name: item?.scientific_name ?? '',
  description: item?.description ?? '',
  suggested_sampling_unit: item?.suggested_sampling_unit ?? '',
  // Una recomendación guardada como "Otro" (desde el admin) no se puede mostrar: queda vacía.
  suggested_control_method:
    item?.suggested_control_method && item.suggested_control_method !== 'other'
      ? item.suggested_control_method
      : '',
});

// Registrar una plaga o enfermedad, o editar `item` si llega. `catalog` sirve para avisar de un
// nombre repetido antes de enviar; el servidor decide con todo el catálogo.
export function PestFormDialog({
  item,
  catalog,
}: {
  item?: PestDisease;
  catalog: readonly PestDisease[];
}) {
  const create = useCreatePestDisease();
  const update = useUpdatePestDisease();
  const isSaving = create.isPending || update.isPending;
  const { open, changeOpen, form, failure, submit } = useCatalogItemForm({
    item,
    catalog,
    createSchema: createPestDiseaseFormSchema,
    valuesOf,
    save: async (values) => {
      const body = toPestDiseaseRequest(values);
      if (item) await update.mutateAsync({ id: item.id, body });
      else await create.mutateAsync(body);
      notify.success(
        item ? 'Cambios guardados' : 'Plaga o enfermedad registrada',
      );
    },
    isSaving,
    duplicateCode: DUPLICATE_PEST_DISEASE_CODE,
    duplicateMessage: DUPLICATE_PEST_DISEASE_MESSAGE,
    fields: FIELDS,
    failureMessage:
      'No fue posible guardar. Revisa tu conexión e inténtalo nuevamente.',
  });
  const {
    register,
    formState: { errors },
  } = form;

  return (
    <CatalogItemDialog
      description={
        item
          ? 'El cambio se ve en el buscador de los monitoreos nuevos; los ya registrados no cambian.'
          : 'Queda disponible en el buscador de la planilla del monitoreo.'
      }
      error={failure}
      isSaving={isSaving}
      itemName={item?.name}
      onOpenChange={changeOpen}
      onSubmit={(event) => {
        void form.handleSubmit(submit)(event);
      }}
      open={open}
      registerLabel="Registrar plaga o enfermedad"
      submitLabel={item ? 'Guardar cambios' : 'Registrar'}
      title={item ? `Editar ${item.name}` : 'Registrar plaga o enfermedad'}
    >
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
    </CatalogItemDialog>
  );
}
