import type { ComponentProps } from 'react';

import { SelectField } from '@/components/select-field';
import { TextAreaField } from '@/components/text-area-field';

import {
  DETAIL_MAX_LENGTH,
  DISCARD_REASON_OPTIONS,
  needsDetail,
} from '../discard-reasons';

type SelectProps = Omit<ComponentProps<typeof SelectField>, 'label'>;
type TextAreaProps = Omit<ComponentProps<typeof TextAreaField>, 'label'>;

// El motivo de un descarte y su detalle: lo usan el descarte parcial de la clasificación y el del
// lote completo. Con Otro el detalle es obligatorio; si no, es una observación opcional que solo
// ofrece el descarte completo (`optionalDetail`).
export function DiscardReasonFields({
  reason,
  reasonProps,
  detailProps,
  optionalDetail = false,
}: {
  reason: string;
  reasonProps: SelectProps;
  detailProps: TextAreaProps;
  optionalDetail?: boolean;
}) {
  const detailRequired = needsDetail(reason);
  return (
    <>
      <SelectField
        label="Motivo del descarte"
        placeholder="Elige un motivo"
        {...reasonProps}
      >
        {DISCARD_REASON_OPTIONS.map(({ value, label }) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </SelectField>
      {(detailRequired || optionalDetail) && (
        <TextAreaField
          label={detailRequired ? 'Detalle' : 'Detalle (opcional)'}
          maxLength={DETAIL_MAX_LENGTH}
          rows={2}
          {...detailProps}
        />
      )}
    </>
  );
}
