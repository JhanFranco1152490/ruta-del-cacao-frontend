'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useMemo } from 'react';
import { FormProvider, useForm, useWatch } from 'react-hook-form';

import { MobileActionBar } from '@/components/mobile-action-bar';
import { buttonVariants } from '@/components/ui/button';

import {
  createSaleFormSchema,
  emptySaleForm,
  emptySaleLine,
  type SaleFormInput,
} from '../sale-schema';
import type { SaleFormScreenState } from '../use-sale-form-screen';
import { SaleHeaderFields } from './sale-header-fields';

// El formulario de una venta: el encabezado y, desde ahí, las líneas de la finca elegida.
export function SaleForm({ screen }: { screen: SaleFormScreenState }) {
  const resolver = useMemo(
    () =>
      zodResolver(createSaleFormSchema({ today: screen.today, options: [] })),
    [screen.today],
  );
  const form = useForm<SaleFormInput>({
    resolver,
    defaultValues: emptySaleForm({
      today: screen.today,
      farmId: screen.initialFarmId,
    }),
  });
  const lines = useWatch({ control: form.control, name: 'lines' });
  const hasLines = lines.some(
    (line) => line.stock || line.quantity_kg.trim() || line.price_per_kg.trim(),
  );

  // Otra finca, otras existencias: las líneas de la anterior se quitan.
  const changeFarm = (farmId: string) => {
    form.setValue('farm_id', farmId, {
      shouldValidate: form.formState.isSubmitted,
    });
    form.setValue('lines', [emptySaleLine()]);
  };

  return (
    <FormProvider {...form}>
      <form className="space-y-6" noValidate>
        <SaleHeaderFields
          disabled={false}
          hasLines={hasLines}
          onFarmChange={changeFarm}
          screen={screen}
        />
        <MobileActionBar>
          <Link
            className={buttonVariants({ size: 'office', variant: 'outline' })}
            href={screen.returnPath}
          >
            Cancelar
          </Link>
        </MobileActionBar>
      </form>
    </FormProvider>
  );
}
