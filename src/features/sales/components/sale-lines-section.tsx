'use client';

import { Plus } from 'lucide-react';
import { useFieldArray, useFormContext, useWatch } from 'react-hook-form';

import { FormSection } from '@/components/form-section';
import { InlineError } from '@/components/form-message';
import { LoadingBlock } from '@/components/loading-block';
import { Button } from '@/components/ui/button';

import { MAX_SALE_LINES } from '../sale-limits';
import { optionsForLine, type StockOption } from '../sale-line-options';
import { NO_STOCK_TO_SELL } from '../sale-messages';
import { emptySaleLine, type SaleFormInput } from '../sale-schema';
import { SaleLineFields } from './sale-line-fields';

type StockRead = {
  isPending: boolean;
  isError: boolean;
  refetch: () => unknown;
};

// Los lotes que se venden, de lo que hay en bodega en la finca elegida.
export function SaleLinesSection({
  farmChosen,
  stock,
  options,
  disabled,
}: {
  farmChosen: boolean;
  stock: StockRead;
  // Las existencias de la finca como opciones de línea.
  options: readonly StockOption[];
  disabled: boolean;
}) {
  const {
    control,
    formState: { errors },
  } = useFormContext<SaleFormInput>();
  const { fields, append, remove } = useFieldArray({ control, name: 'lines' });
  const lines = useWatch({ control, name: 'lines' });
  const chosen = lines.map(({ stock: value }) => value);
  const linesError = errors.lines?.root?.message ?? errors.lines?.message;
  // Cada línea toma una existencia distinta: con todas tomadas no hay qué agregar.
  const canAdd =
    fields.length < MAX_SALE_LINES && fields.length < options.length;

  return (
    <FormSection title="Lotes">
      <div className="mt-4 space-y-4">
        <LinesBody farmChosen={farmChosen} options={options} stock={stock}>
          <ul aria-label="Líneas de la venta" className="space-y-3">
            {fields.map((field, index) => (
              <SaleLineFields
                disabled={disabled}
                index={index}
                key={field.id}
                offered={optionsForLine(options, chosen, index)}
                onRemove={() => remove(index)}
                options={options}
              />
            ))}
          </ul>
          <InlineError>{linesError}</InlineError>
          <Button
            disabled={disabled || !canAdd}
            onClick={() => append(emptySaleLine())}
            size="office"
            type="button"
            variant="outline"
          >
            <Plus aria-hidden="true" className="size-4" /> Agregar línea
          </Button>
        </LinesBody>
      </div>
    </FormSection>
  );
}

// Lo que va en lugar de las líneas mientras no hay de qué vender: falta la finca, se están leyendo
// sus existencias, falló la lectura o no tiene cacao en bodega.
function LinesBody({
  farmChosen,
  stock,
  options,
  children,
}: {
  farmChosen: boolean;
  stock: StockRead;
  options: readonly StockOption[];
  children: React.ReactNode;
}) {
  if (!farmChosen) {
    return (
      <p className="text-muted-foreground">
        Elige la finca para ver lo que hay en bodega.
      </p>
    );
  }
  if (stock.isPending) {
    return (
      <LoadingBlock label="Cargando lo que hay en bodega" shapes={['h-24']} />
    );
  }
  if (stock.isError) {
    return (
      <div className="space-y-2">
        <InlineError>No fue posible cargar lo que hay en bodega.</InlineError>
        <Button
          onClick={() => void stock.refetch()}
          size="office"
          type="button"
          variant="outline"
        >
          Reintentar
        </Button>
      </div>
    );
  }
  if (options.length === 0) {
    return <p className="font-bold text-warn">{NO_STOCK_TO_SELL}</p>;
  }
  return children;
}
