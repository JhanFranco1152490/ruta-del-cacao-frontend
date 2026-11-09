'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import {
  FormProvider,
  type Resolver,
  useForm,
  useWatch,
} from 'react-hook-form';

import { FormMessage } from '@/components/form-message';
import { MobileActionBar } from '@/components/mobile-action-bar';
import { Button, buttonVariants } from '@/components/ui/button';

import { useFarmStock } from '../queries';
import { type StockOption, stockOptions } from '../sale-line-options';
import {
  createSaleFormSchema,
  emptySaleForm,
  emptySaleLine,
  type SaleFormInput,
} from '../sale-schema';
import type { SaleFormScreenState } from '../use-sale-form-screen';
import { useSaleSubmit } from '../use-sale-submit';
import { SaleHeaderFields } from './sale-header-fields';
import { SaleInvoiceField } from './sale-invoice-field';
import { SaleLinesSection } from './sale-lines-section';

type SaleFormContext = { options: readonly StockOption[]; today: string };

const resolver: Resolver<SaleFormInput, SaleFormContext> = (
  values,
  context,
  options,
) =>
  zodResolver(
    createSaleFormSchema({
      today: context?.today ?? '',
      options: context?.options ?? [],
    }),
  )(values, context, options);

// El formulario de una venta: el encabezado y, desde ahí, las líneas de la finca elegida.
export function SaleForm({ screen }: { screen: SaleFormScreenState }) {
  // Los kilos y la fecha se revisan contra las existencias de la finca, que dependen de la finca
  // elegida en este mismo formulario: el contexto las lee al validar, ya con las de este render.
  let options: StockOption[] = [];
  const form = useForm<SaleFormInput, SaleFormContext>({
    resolver,
    context: {
      today: screen.today,
      get options() {
        return options;
      },
    },
    defaultValues: emptySaleForm({
      today: screen.today,
      farmId: screen.initialFarmId,
    }),
  });
  const farmId = useWatch({ control: form.control, name: 'farm_id' });
  const stock = useFarmStock(farmId);
  options = stockOptions(stock.data ?? []);
  const submit = useSaleSubmit({
    options,
    setError: form.setError,
    returnPath: screen.returnPath,
  });
  const saving = submit.isSaving;
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
      <form
        className="space-y-6"
        noValidate
        onSubmit={(event) =>
          void form.handleSubmit(submit.onValid, submit.onInvalid)(event)
        }
      >
        <FormMessage>{submit.formError}</FormMessage>
        <SaleHeaderFields
          disabled={saving}
          hasLines={hasLines}
          onFarmChange={changeFarm}
          screen={screen}
        />
        <SaleLinesSection
          disabled={saving}
          farmChosen={!!farmId}
          options={options}
          stock={stock}
        />
        <SaleInvoiceField
          disabled={saving}
          error={submit.invoiceError}
          file={submit.invoice}
          onChoose={submit.chooseInvoice}
          onRemove={submit.removeInvoice}
        />
        <MobileActionBar>
          <Button disabled={saving} size="office" type="submit">
            {saving ? 'Guardando…' : 'Guardar venta'}
          </Button>
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
