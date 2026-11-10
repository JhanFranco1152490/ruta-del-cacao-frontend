'use client';

import { Plus } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { Controller, useFormContext } from 'react-hook-form';

import { SearchSelect } from '@/components/search-select';
import { Button } from '@/components/ui/button';
import { BUYERS_PATH } from '@/lib/paths/buyers';

import { NO_ACTIVE_BUYERS } from '../sale-messages';
import type { RenderNewBuyer } from '../sale-new-buyer';
import type { SaleFormInput } from '../sale-schema';
import type { SaleFormScreenState } from '../use-sale-form-screen';

// A quién se vende: los compradores activos del productor y, con permiso, registrar uno nuevo sin
// salir del formulario.
export function SaleBuyerField({
  screen,
  renderNewBuyer,
  disabled,
}: {
  screen: SaleFormScreenState;
  // Registrar un comprador sin salir del formulario; sin ella, se lleva a Compradores.
  renderNewBuyer?: RenderNewBuyer;
  disabled: boolean;
}) {
  const {
    control,
    setValue,
    formState: { errors },
  } = useFormContext<SaleFormInput>();
  const [registering, setRegistering] = useState(false);
  const { buyerOptions } = screen;
  const noBuyers = screen.buyers.isSuccess && buyerOptions.length === 0;
  const canRegister = screen.can.addBuyer && !!renderNewBuyer;

  // El comprador recién registrado (o el que ya existía) entra a la lista y queda elegido.
  const chooseBuyer = async (buyerId: string) => {
    await screen.buyers.refetch();
    setValue('buyer_id', buyerId, { shouldDirty: true, shouldValidate: true });
  };

  return (
    <div>
      <Controller
        control={control}
        name="buyer_id"
        render={({ field }) => (
          <SearchSelect
            disabled={disabled || screen.needsProducer || noBuyers}
            error={errors.buyer_id?.message}
            label="Comprador"
            onBlur={field.onBlur}
            onChange={(option) => field.onChange(option?.id ?? '')}
            options={buyerOptions}
            placeholder="Elige a quién le vendes"
            value={buyerOptions.find(({ id }) => id === field.value) ?? null}
          />
        )}
      />
      {noBuyers && (
        <p className="mt-2 text-sm font-bold text-warn" role="status">
          {NO_ACTIVE_BUYERS}{' '}
          {screen.can.addBuyer && !renderNewBuyer && (
            <Link className="underline" href={BUYERS_PATH}>
              Registrar comprador
            </Link>
          )}
        </p>
      )}
      {canRegister && (
        <Button
          className="mt-1 -ml-4"
          disabled={disabled || screen.needsProducer}
          onClick={() => setRegistering(true)}
          size="office"
          type="button"
          variant="ghost"
        >
          <Plus aria-hidden="true" className="size-4" /> Registrar comprador
        </Button>
      )}
      {registering && (
        // El diálogo se dibuja en un portal, pero sus eventos suben por el árbol de React hasta el
        // formulario de la venta: sin esto, guardar el comprador enviaría también la venta.
        <div onSubmit={(event) => event.stopPropagation()}>
          {renderNewBuyer?.({
            producer: screen.producer,
            chooseProducer: screen.superuser,
            existingLabel: 'Elegir este comprador',
            onClose: () => setRegistering(false),
            onDone: (id) => void chooseBuyer(id),
          })}
        </div>
      )}
    </div>
  );
}
