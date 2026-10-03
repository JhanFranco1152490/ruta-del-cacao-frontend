'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Pencil, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';

import { SubmitButton } from '@/components/submit-button';
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

import {
  type CacaoVariety,
  DUPLICATE_VARIETY_CODE,
  useCreateCacaoVariety,
  useUpdateCacaoVariety,
} from '../api';
import { normalizeVarietyName } from '../characterization-rules';
import {
  createVarietyFormSchema,
  DUPLICATE_VARIETY_MESSAGE,
  VARIETY_DESCRIPTION_MAX_LENGTH,
  VARIETY_NAME_MAX_LENGTH,
  type VarietyFormValues,
} from '../schemas';

// Registrar una variedad, o editar `variety` si llega. `catalog` sirve para avisar de un nombre
// repetido antes de enviar; el servidor decide con todo el catálogo.
export function VarietyFormDialog({
  variety,
  catalog,
}: {
  variety?: CacaoVariety;
  catalog: readonly CacaoVariety[];
}) {
  const [open, setOpen] = useState(false);
  const create = useCreateCacaoVariety();
  const update = useUpdateCacaoVariety();
  const [failure, setFailure] = useState<string>();
  const isSaving = create.isPending || update.isPending;

  const schema = useMemo(
    () =>
      createVarietyFormSchema(
        new Set(
          catalog
            .filter((other) => other.id !== variety?.id)
            .map((other) => normalizeVarietyName(other.name)),
        ),
      ),
    [catalog, variety?.id],
  );
  const currentValues = (): VarietyFormValues => ({
    name: variety?.name ?? '',
    description: variety?.description ?? '',
  });
  const form = useForm<VarietyFormValues>({
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

  const submit = async (values: VarietyFormValues) => {
    setFailure(undefined);
    try {
      if (variety) await update.mutateAsync({ id: variety.id, body: values });
      else await create.mutateAsync(values);
      // Directo y no con `changeOpen`: la mutación todavía figura en curso en este punto.
      setOpen(false);
    } catch (error) {
      if (isApiError(error) && error.code === DUPLICATE_VARIETY_CODE) {
        form.setError('name', {
          type: 'server',
          message: DUPLICATE_VARIETY_MESSAGE,
        });
        return;
      }
      const { applied, unmatched } = applyApiFieldErrors(error, form.setError, [
        'name',
        'description',
      ]);
      if (applied && unmatched.length === 0) return;
      setFailure(
        unmatched[0] ??
          getErrorMessage(
            error,
            'No fue posible guardar la variedad. Revisa tu conexión e inténtalo nuevamente.',
          ),
      );
    }
  };

  return (
    <Dialog onOpenChange={changeOpen} open={open}>
      <DialogTrigger
        render={
          variety ? (
            <Button
              aria-label={`Editar ${variety.name}`}
              className="h-11"
              variant="outline"
            />
          ) : (
            <Button size="office" />
          )
        }
      >
        {variety ? (
          <>
            <Pencil aria-hidden="true" className="size-4" /> Editar
          </>
        ) : (
          <>
            <Plus aria-hidden="true" className="size-4" /> Registrar variedad
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
              {variety ? `Editar ${variety.name}` : 'Registrar variedad'}
            </DialogTitle>
            <DialogDescription>
              {variety
                ? 'El cambio se ve en todas las fichas que usan esta variedad.'
                : 'Queda disponible para que los productores la elijan en la ficha de sus parcelas.'}
            </DialogDescription>
          </DialogHeader>
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
            error={errors.description?.message}
            hint="Procedencia, compatibilidad u otro dato útil."
            label="Descripción (opcional)"
            maxLength={VARIETY_DESCRIPTION_MAX_LENGTH}
            {...register('description')}
          />
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
            <SubmitButton pending={isSaving} pendingLabel="Guardando…">
              {variety ? 'Guardar cambios' : 'Registrar variedad'}
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
