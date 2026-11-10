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
import { FormSection } from '@/components/form-section';
import { MobileActionBar } from '@/components/mobile-action-bar';
import { Button, buttonVariants } from '@/components/ui/button';

import { useFarmStock } from '../queries';
import { saleTotals } from '../sale-amounts';
import type { RenderNewBuyer } from '../sale-new-buyer';
import {
  findStockOption,
  type StockOption,
  stockOptions,
} from '../sale-line-options';
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
import { SaleTotals } from './sale-totals';

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
export function SaleForm({
  screen,
  renderNewBuyer,
}: {
  screen: SaleFormScreenState;
  renderNewBuyer?: RenderNewBuyer;
}) {
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

  const totals = saleTotals(
    lines.map((line) => ({
      grade: findStockOption(options, line.stock)?.grade ?? null,
      quantity_kg: line.quantity_kg,
      price_per_kg: line.price_per_kg,
    })),
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
        className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start"
        noValidate
        onSubmit={(event) =>
          void form.handleSubmit(submit.onValid, submit.onInvalid)(event)
        }
      >
        <div className="min-w-0 space-y-6">
          <FormMessage>{submit.formError}</FormMessage>
          <SaleHeaderFields
            disabled={saving}
            hasLines={hasLines}
            onFarmChange={changeFarm}
            renderNewBuyer={renderNewBuyer}
            screen={screen}
          />
          <SaleLinesSection
            disabled={saving}
            farmChosen={!!farmId}
            options={options}
            stock={stock}
          />
        </div>
        {/* El resumen, el soporte y los botones van juntos: en escritorio se quedan a la vista
            mientras se recorren las líneas; en celular van debajo de ellas, con los botones fijos. */}
        <aside className="min-w-0 space-y-6 lg:sticky lg:top-20">
          <FormSection compact title="Resumen">
            <SaleTotals {...totals} />
          </FormSection>
          <SaleInvoiceField
            disabled={saving}
            error={submit.invoiceError}
            file={submit.invoice}
            onChoose={submit.chooseInvoice}
            onRemove={submit.removeInvoice}
          />
          <MobileActionBar>
            <Button
              className="lg:w-full"
              disabled={saving}
              size="office"
              type="submit"
            >
              {saving ? 'Guardando…' : 'Guardar venta'}
            </Button>
            <Link
              className={buttonVariants({
                size: 'office',
                variant: 'outline',
                className: 'lg:w-full',
              })}
              href={screen.returnPath}
            >
              Cancelar
            </Link>
          </MobileActionBar>
        </aside>
      </form>
    </FormProvider>
  );
}
