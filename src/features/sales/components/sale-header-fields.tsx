'use client';

import { ArrowRightLeft } from 'lucide-react';
import { useState } from 'react';
import { Controller, useFormContext } from 'react-hook-form';

import { FormSection } from '@/components/form-section';
import { ProducerFilter } from '@/components/producer-filter';
import { SearchSelect } from '@/components/search-select';
import { StatusChangeDialog } from '@/components/status-change-dialog';
import { TextAreaField } from '@/components/text-area-field';
import { TextField } from '@/components/text-field';

import { CHANGE_FARM_QUESTION } from '../sale-messages';
import type { RenderNewBuyer } from '../sale-new-buyer';
import { NOTES_MAX_LENGTH } from '../sale-limits';
import type { SaleFormInput } from '../sale-schema';
import type { SaleFormScreenState } from '../use-sale-form-screen';
import { SaleBuyerField } from './sale-buyer-field';

const CHANGE_FARM = {
  trigger: 'Cambiar de finca',
  title: CHANGE_FARM_QUESTION,
  description:
    'Los lotes son de una sola finca: una venta no mezcla cacao de dos.',
  confirm: 'Cambiar de finca',
  pending: 'Cambiando…',
  Icon: ArrowRightLeft,
  variant: 'default' as const,
};

// De quién y a quién se vende, y cuándo. La finca decide de qué existencias salen las líneas:
// cambiarla con líneas escritas las quita, y se pregunta antes.
export function SaleHeaderFields({
  screen,
  hasLines,
  onFarmChange,
  renderNewBuyer,
  disabled,
}: {
  screen: SaleFormScreenState;
  // Si alguna línea tiene algo escrito.
  hasLines: boolean;
  // La finca cambió: las líneas de la anterior ya no valen.
  onFarmChange: (farmId: string) => void;
  // Registrar un comprador sin salir del formulario; sin ella, se lleva a Compradores.
  renderNewBuyer?: RenderNewBuyer;
  disabled: boolean;
}) {
  const {
    control,
    register,
    formState: { errors },
  } = useFormContext<SaleFormInput>();
  const [nextFarm, setNextFarm] = useState<string | null>(null);
  const { farmOptions } = screen;
  const onlyFarm = farmOptions.length === 1 ? farmOptions[0] : null;

  return (
    <FormSection title="La venta">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        {screen.superuser && (
          <ProducerFilter
            className="sm:col-span-2"
            onClear={() => screen.setProducer(null)}
            onSelect={screen.setProducer}
            producer={screen.producer ?? undefined}
            selected={screen.selectedProducer}
          />
        )}
        <Controller
          control={control}
          name="farm_id"
          render={({ field }) =>
            onlyFarm ? (
              <div>
                <p className="text-sm font-bold">Finca</p>
                <p className="mt-2">{onlyFarm.label}</p>
              </div>
            ) : (
              <SearchSelect
                disabled={disabled || screen.needsProducer}
                error={errors.farm_id?.message}
                label="Finca"
                onBlur={field.onBlur}
                onChange={(option) => {
                  const id = option?.id ?? '';
                  if (id === field.value) return;
                  if (hasLines) setNextFarm(id);
                  else onFarmChange(id);
                }}
                options={farmOptions}
                placeholder="Elige la finca de donde sale el cacao"
                value={farmOptions.find(({ id }) => id === field.value) ?? null}
              />
            )
          }
        />
        <SaleBuyerField
          disabled={disabled}
          renderNewBuyer={renderNewBuyer}
          screen={screen}
        />
        <TextField
          disabled={disabled}
          error={errors.sale_date?.message}
          label="Fecha de la venta"
          max={screen.today}
          type="date"
          {...register('sale_date')}
        />
        <TextAreaField
          disabled={disabled}
          error={errors.notes?.message}
          hint={`Opcional, hasta ${NOTES_MAX_LENGTH} caracteres.`}
          label="Observaciones"
          maxLength={NOTES_MAX_LENGTH}
          rows={2}
          wrapperClassName="sm:col-span-2"
          {...register('notes')}
        />
      </div>
      <StatusChangeDialog
        action={CHANGE_FARM}
        isPending={false}
        onConfirm={() => {
          if (nextFarm !== null) onFarmChange(nextFarm);
          setNextFarm(null);
        }}
        onOpenChange={(open) => {
          if (!open) setNextFarm(null);
        }}
        open={nextFarm !== null}
      />
    </FormSection>
  );
}
