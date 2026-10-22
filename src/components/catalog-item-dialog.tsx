'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Pencil, Plus } from 'lucide-react';
import {
  type FormEventHandler,
  type ReactNode,
  useMemo,
  useState,
} from 'react';
import {
  type DefaultValues,
  type FieldValues,
  type Path,
  useForm,
} from 'react-hook-form';
import type { z } from 'zod';

import { FormDialogForm } from '@/components/form-dialog';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { isApiError } from '@/lib/api/errors';
import { serverErrorSummary } from '@/lib/api/form-errors';
import { normalizeCatalogName } from '@/lib/format/search';

type CatalogItem = { id: string; name: string };

// Lo que comparten los catálogos que administra la asociación (variedades, plagas y
// enfermedades): registrar o editar uno desde un diálogo, con el nombre único en todo el catálogo.
export function useCatalogItemForm<
  TItem extends CatalogItem,
  TInput extends FieldValues & { name: string },
  TValues,
>({
  item,
  catalog,
  createSchema,
  valuesOf,
  save,
  isSaving,
  duplicateCode,
  duplicateMessage,
  fields,
  failureMessage,
}: {
  item?: TItem;
  catalog: readonly TItem[];
  // El esquema avisa de un nombre repetido antes de enviar; el servidor decide con todo el
  // catálogo.
  createSchema: (takenNames: Set<string>) => z.ZodType<TValues, TInput>;
  valuesOf: (item?: TItem) => TInput;
  save: (values: TValues) => Promise<unknown>;
  isSaving: boolean;
  duplicateCode: string;
  duplicateMessage: string;
  fields: readonly Path<TInput>[];
  failureMessage: string;
}) {
  const [open, setOpen] = useState(false);
  const [failure, setFailure] = useState<string>();
  const schema = useMemo(
    () =>
      createSchema(
        new Set(
          catalog
            .filter((other) => other.id !== item?.id)
            .map((other) => normalizeCatalogName(other.name)),
        ),
      ),
    [catalog, item?.id, createSchema],
  );
  const form = useForm<TInput, unknown, TValues>({
    resolver: zodResolver(schema),
    defaultValues: valuesOf(item) as DefaultValues<TInput>,
  });

  // Se reinicia al abrir, con lo vigente: una edición parte de lo último guardado y un registro
  // nuevo, vacío.
  const changeOpen = (next: boolean) => {
    if (isSaving) return;
    if (next) {
      form.reset(valuesOf(item));
      setFailure(undefined);
    }
    setOpen(next);
  };

  const submit = async (values: TValues) => {
    setFailure(undefined);
    try {
      await save(values);
      // Directo y no con `changeOpen`: la mutación todavía figura en curso en este punto.
      setOpen(false);
    } catch (error) {
      if (isApiError(error) && error.code === duplicateCode) {
        form.setError('name' as Path<TInput>, {
          type: 'server',
          message: duplicateMessage,
        });
        return;
      }
      setFailure(
        serverErrorSummary(error, form.setError, fields, failureMessage),
      );
    }
  };

  return { open, changeOpen, form, failure, submit };
}

// El botón (Editar en la fila, Registrar en el encabezado) y el diálogo con el formulario.
export function CatalogItemDialog({
  itemName,
  registerLabel,
  open,
  onOpenChange,
  isSaving,
  title,
  description,
  error,
  onSubmit,
  submitLabel,
  children,
}: {
  // El nombre del registro que se edita; sin él, se registra uno nuevo.
  itemName?: string;
  registerLabel: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isSaving: boolean;
  title: string;
  description: string;
  error?: string;
  onSubmit: FormEventHandler<HTMLFormElement>;
  submitLabel: string;
  children: ReactNode;
}) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogTrigger
        render={
          itemName ? (
            <Button
              aria-label={`Editar ${itemName}`}
              className="h-11"
              variant="action"
            />
          ) : (
            <Button size="office" />
          )
        }
      >
        {itemName ? (
          <>
            <Pencil aria-hidden="true" className="size-4" /> Editar
          </>
        ) : (
          <>
            <Plus aria-hidden="true" className="size-4" /> {registerLabel}
          </>
        )}
      </DialogTrigger>
      <DialogContent showCloseButton={!isSaving}>
        <FormDialogForm
          description={description}
          error={error}
          isSaving={isSaving}
          onSubmit={onSubmit}
          submitLabel={submitLabel}
          title={title}
        >
          {children}
        </FormDialogForm>
      </DialogContent>
    </Dialog>
  );
}
