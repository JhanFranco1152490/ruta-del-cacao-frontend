import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm } from 'react-hook-form';
import { describe, expect, it, vi } from 'vitest';

import type { CatalogInput, UsedInputRow } from '@/lib/input-usage';

import { NO_CATALOG_MESSAGE, UsedInputsSection } from './used-inputs-section';

// La lista va dentro de otra, como los insumos del control de cada detección de un monitoreo: la
// sección tiene que funcionar fuera de la raíz del formulario.
type NestedForm = {
  detections: { control: { inputs: UsedInputRow[] } }[];
};

const catalog: CatalogInput[] = [
  {
    id: 'urea',
    name: 'Urea 46 %',
    unit: 'kg',
    package_type: 'sack',
    package_size: '50.000',
    is_active: true,
  },
  {
    id: 'copper',
    name: 'Óxido de cobre',
    unit: 'kg',
    package_type: null,
    package_size: null,
    is_active: true,
  },
];

function NestedInputs({
  inputs = [],
  withCatalog = true,
  error,
  onValues,
}: {
  inputs?: UsedInputRow[];
  withCatalog?: boolean;
  error?: string;
  onValues?: (values: NestedForm) => void;
}) {
  const { control, handleSubmit, setError } = useForm<NestedForm>({
    defaultValues: { detections: [{ control: { inputs } }] },
  });
  return (
    <form onSubmit={(event) => void handleSubmit((v) => onValues?.(v))(event)}>
      <UsedInputsSection
        catalog={withCatalog ? catalog : undefined}
        control={control}
        disabled={false}
        name="detections.0.control.inputs"
        stocks={new Map([['urea', '170.000']])}
      />
      {error && (
        <button
          onClick={() =>
            setError('detections.0.control.inputs.0.quantity', {
              message: error,
            })
          }
          type="button"
        >
          Marcar error
        </button>
      )}
      <button type="submit">Guardar</button>
    </form>
  );
}

const row = (number: number) =>
  screen.getByRole('group', { name: `Insumo ${number}` });

describe('UsedInputsSection', () => {
  it('adds rows and saves what is written in the nested list', async () => {
    const onValues = vi.fn();
    render(<NestedInputs onValues={onValues} />);

    await userEvent.click(
      screen.getByRole('button', { name: 'Agregar insumo' }),
    );
    const picker = within(row(1)).getByLabelText('Insumo');
    await userEvent.click(picker);
    await userEvent.type(picker, 'urea');
    await userEvent.click(
      await screen.findByRole('option', { name: 'Urea 46 %' }),
    );
    await userEvent.type(within(row(1)).getByLabelText('Cantidad (kg)'), '100');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(onValues).toHaveBeenCalledWith({
      detections: [
        { control: { inputs: [{ input_id: 'urea', quantity: '100' }] } },
      ],
    });
    expect(within(row(1)).getByText('100 kg · 2 bultos')).toBeInTheDocument();
    expect(within(row(1)).getByText('Hay 170 kg · 3,4 bultos')).toBeVisible();
  });

  it('removes a row', async () => {
    render(
      <NestedInputs
        inputs={[
          { input_id: 'urea', quantity: '1' },
          { input_id: 'copper', quantity: '2' },
        ]}
      />,
    );

    await userEvent.click(
      screen.getByRole('button', { name: 'Quitar insumo 1' }),
    );

    expect(
      screen.queryByRole('group', { name: 'Insumo 2' }),
    ).not.toBeInTheDocument();
    expect(within(row(1)).getByLabelText('Insumo')).toHaveValue(
      'Óxido de cobre',
    );
  });

  it('shows the error of a field of the nested list next to it', async () => {
    render(
      <NestedInputs
        error="Indique la cantidad del insumo"
        inputs={[{ input_id: 'urea', quantity: '' }]}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Marcar error' }));

    expect(
      within(row(1)).getByText('Indique la cantidad del insumo'),
    ).toBeInTheDocument();
    expect(within(row(1)).getByLabelText('Cantidad (kg)')).toHaveAttribute(
      'aria-invalid',
      'true',
    );
  });

  it('does not let add inputs without the catalog in the device', () => {
    render(<NestedInputs withCatalog={false} />);

    const add = screen.getByRole('button', { name: 'Agregar insumo' });
    expect(add).toBeDisabled();
    expect(add).toHaveAccessibleDescription(NO_CATALOG_MESSAGE);
  });
});
