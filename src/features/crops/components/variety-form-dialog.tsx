'use client';

import {
  CatalogItemDialog,
  useCatalogItemForm,
} from '@/components/catalog-item-dialog';
import { TextField } from '@/components/text-field';

import {
  type CacaoVariety,
  DUPLICATE_VARIETY_CODE,
  useCreateCacaoVariety,
  useUpdateCacaoVariety,
} from '../api';
import {
  createVarietyFormSchema,
  DUPLICATE_VARIETY_MESSAGE,
  MAX_COMMON_NAMES,
  VARIETY_DESCRIPTION_MAX_LENGTH,
  VARIETY_NAME_MAX_LENGTH,
  type VarietyFormInput,
} from '../schemas';

const FIELDS = ['name', 'common_names', 'description'] as const;

const valuesOf = (variety?: CacaoVariety): VarietyFormInput => ({
  name: variety?.name ?? '',
  common_names: variety?.common_names.join(', ') ?? '',
  description: variety?.description ?? '',
});

// Registrar una variedad, o editar `variety` si llega. `catalog` sirve para avisar de un nombre
// repetido antes de enviar; el servidor decide con todo el catálogo.
export function VarietyFormDialog({
  variety,
  catalog,
}: {
  variety?: CacaoVariety;
  catalog: readonly CacaoVariety[];
}) {
  const create = useCreateCacaoVariety();
  const update = useUpdateCacaoVariety();
  const isSaving = create.isPending || update.isPending;
  const { open, changeOpen, form, failure, submit } = useCatalogItemForm({
    item: variety,
    catalog,
    createSchema: createVarietyFormSchema,
    valuesOf,
    save: (values) =>
      variety
        ? update.mutateAsync({ id: variety.id, body: values })
        : create.mutateAsync(values),
    isSaving,
    duplicateCode: DUPLICATE_VARIETY_CODE,
    duplicateMessage: DUPLICATE_VARIETY_MESSAGE,
    fields: FIELDS,
    failureMessage:
      'No fue posible guardar la variedad. Revisa tu conexión e inténtalo nuevamente.',
  });
  const {
    register,
    formState: { errors },
  } = form;

  return (
    <CatalogItemDialog
      description={
        variety
          ? 'El cambio se ve en todas las fichas que usan esta variedad.'
          : 'Queda disponible para que los productores la elijan en la ficha de sus parcelas.'
      }
      error={failure}
      isSaving={isSaving}
      itemName={variety?.name}
      onOpenChange={changeOpen}
      onSubmit={(event) => {
        void form.handleSubmit(submit)(event);
      }}
      open={open}
      registerLabel="Registrar variedad"
      submitLabel={variety ? 'Guardar cambios' : 'Registrar variedad'}
      title={variety ? `Editar ${variety.name}` : 'Registrar variedad'}
    >
      <TextField
        disabled={isSaving}
        error={errors.name?.message}
        hint="Por ejemplo, CCN-51 o ICS-95."
        label="Nombre"
        maxLength={VARIETY_NAME_MAX_LENGTH}
        {...register('name')}
      />
      <TextField
        disabled={isSaving}
        error={errors.common_names?.message}
        hint={`Como lo llaman los productores, separados por coma (hasta ${MAX_COMMON_NAMES}). Por ejemplo, Saravena. Pueden repetirse en otras variedades.`}
        label="Nombres comunes (opcional)"
        {...register('common_names')}
      />
      <TextField
        disabled={isSaving}
        error={errors.description?.message}
        hint="Procedencia, compatibilidad u otro dato útil."
        label="Descripción (opcional)"
        maxLength={VARIETY_DESCRIPTION_MAX_LENGTH}
        {...register('description')}
      />
    </CatalogItemDialog>
  );
}
