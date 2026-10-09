import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';

import { todayInBogota } from '@/lib/format/dates';
import {
  apiError,
  buildAgriculturalInput,
  buildInputStock,
} from '@/test/factories';
import { apiUrl } from '@/test/handlers';
import { server } from '@/test/server';

import {
  type InputsBackend,
  openMenuAction,
  renderInputsScreen,
  startInputsBackend,
} from './inputs-test-kit';

// Urea en kg, presentación Bulto de 50 kg.
const urea = buildAgriculturalInput({ id: 'urea' });
const traps = buildAgriculturalInput({
  id: 'traps',
  name: 'Trampas',
  input_type: 'other',
  unit: 'unit',
  package_type: null,
  package_size: null,
});

let backend: InputsBackend;

beforeEach(() => {
  backend = startInputsBackend([urea, traps]);
});

const save = (dialog: HTMLElement, name: string) =>
  userEvent.click(within(dialog).getByRole('button', { name }));

const dialogClosed = () =>
  waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

const rowOf = async (name: string) => {
  const table = await screen.findByRole('table', { name: 'Insumos' });
  const row = within(table)
    .getAllByRole('row')
    .find((candidate) => within(candidate).queryByText(name));
  if (!row) throw new Error(`No hay fila para ${name}`);
  return row;
};

describe('entry', () => {
  it('registers a purchase written in packages and shows the new stock', async () => {
    renderInputsScreen({ searchParams: '?finca=f1' });
    const dialog = await openMenuAction('Urea 46 %', 'Registrar entrada');

    expect(within(dialog).getByLabelText('Finca')).toHaveValue('f1');
    expect(within(dialog).getByLabelText('Fecha')).toHaveValue(todayInBogota());
    await userEvent.type(
      within(dialog).getByLabelText('Cantidad (bultos)'),
      '3',
    );
    expect(within(dialog).getByText('= 150 kg')).toBeInTheDocument();
    await userEvent.type(
      within(dialog).getByLabelText('Nota (opcional)'),
      'Compra de octubre',
    );

    await save(dialog, 'Registrar entrada');

    await dialogClosed();
    expect(backend.movements).toEqual([
      {
        id: expect.any(String),
        input_id: 'urea',
        farm_id: 'f1',
        kind: 'entry',
        quantity: '150',
        occurred_on: todayInBogota(),
        note: 'Compra de octubre',
      },
    ]);
    expect(await screen.findByText('Entrada registrada')).toBeInTheDocument();
    expect(
      await within(await rowOf('Urea 46 %')).findByText('150 kg · 3 bultos'),
    ).toBeInTheDocument();
  });

  it('can be written in the unit of the input', async () => {
    renderInputsScreen({ searchParams: '?finca=f1' });
    const dialog = await openMenuAction('Urea 46 %', 'Registrar entrada');

    await userEvent.click(within(dialog).getByRole('button', { name: 'kg' }));
    await userEvent.type(
      within(dialog).getByLabelText('Cantidad (kg)'),
      '25,5',
    );
    await save(dialog, 'Registrar entrada');

    await dialogClosed();
    expect(backend.movements[0]).toMatchObject({ quantity: '25.5' });
  });

  it('writes in the unit when the input has no package', async () => {
    renderInputsScreen({ searchParams: '?finca=f1' });
    const dialog = await openMenuAction('Trampas', 'Registrar entrada');

    expect(
      within(dialog).queryByRole('group', { name: 'Escribir la cantidad en' }),
    ).not.toBeInTheDocument();
    await userEvent.type(
      within(dialog).getByLabelText('Cantidad (unidades)'),
      '12',
    );
    expect(within(dialog).getByText('= 12 unidades')).toBeInTheDocument();
  });

  it('checks the amount and the date before sending', async () => {
    renderInputsScreen({ searchParams: '?finca=f1' });
    const dialog = await openMenuAction('Urea 46 %', 'Registrar entrada');

    await save(dialog, 'Registrar entrada');
    expect(
      await within(dialog).findByText('Campo obligatorio'),
    ).toBeInTheDocument();

    await userEvent.type(
      within(dialog).getByLabelText('Cantidad (bultos)'),
      '0',
    );
    const date = within(dialog).getByLabelText('Fecha');
    await userEvent.clear(date);
    await userEvent.type(date, '2999-01-01');
    await save(dialog, 'Registrar entrada');

    expect(
      await within(dialog).findByText('La cantidad debe ser mayor que cero.'),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText('La fecha no puede ser posterior a hoy.'),
    ).toBeInTheDocument();
    expect(backend.movements).toHaveLength(0);
  });

  it('explains why an inactive input or farm does not take entries, keeping what was written', async () => {
    server.use(
      http.post(apiUrl('/api/input-movements'), () =>
        apiError(422, 'farm_inactive'),
      ),
    );
    renderInputsScreen({ searchParams: '?finca=f1' });
    const dialog = await openMenuAction('Urea 46 %', 'Registrar entrada');
    await userEvent.type(
      within(dialog).getByLabelText('Cantidad (bultos)'),
      '2',
    );

    await save(dialog, 'Registrar entrada');

    expect(
      await within(dialog).findByText(
        'La finca está inactiva: no recibe entradas ni conteos.',
      ),
    ).toBeInTheDocument();
    expect(within(dialog).getByLabelText('Cantidad (bultos)')).toHaveValue('2');
  });

  it('retries with the same id, so the server does not register it twice', async () => {
    const ids: string[] = [];
    let attempts = 0;
    server.use(
      http.post(apiUrl('/api/input-movements'), async ({ request }) => {
        attempts += 1;
        ids.push(((await request.json()) as { id: string }).id);
        if (attempts === 1) return HttpResponse.error();
        return HttpResponse.json(
          { movement: {}, stock: buildInputStock({ input_id: 'urea' }) },
          { status: 200 },
        );
      }),
    );
    renderInputsScreen({ searchParams: '?finca=f1' });
    const dialog = await openMenuAction('Urea 46 %', 'Registrar entrada');
    await userEvent.type(
      within(dialog).getByLabelText('Cantidad (bultos)'),
      '1',
    );

    await save(dialog, 'Registrar entrada');
    expect(
      await within(dialog).findByText(/Revisa tu conexión/),
    ).toBeInTheDocument();
    await save(dialog, 'Registrar entrada');

    await dialogClosed();
    expect(ids).toHaveLength(2);
    expect(ids[1]).toBe(ids[0]);
  });
});

describe('count', () => {
  it('shows what the system has and the difference that will be registered', async () => {
    backend.stocks = [
      buildInputStock({ input_id: 'urea', quantity: '100.000' }),
    ];
    renderInputsScreen({ searchParams: '?finca=f1' });
    const dialog = await openMenuAction('Urea 46 %', 'Registrar conteo');

    expect(
      await within(dialog).findByText('100 kg · 2 bultos'),
    ).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: 'kg' }));
    await userEvent.type(
      within(dialog).getByLabelText('Cantidad contada (kg)'),
      '80',
    );
    expect(within(dialog).getByText('Diferencia: −20 kg')).toBeInTheDocument();

    await save(dialog, 'Registrar conteo');

    await dialogClosed();
    expect(backend.movements[0]).toMatchObject({
      kind: 'count',
      counted_quantity: '80',
    });
    expect(await screen.findByText('Conteo registrado')).toBeInTheDocument();
    expect(
      await within(await rowOf('Urea 46 %')).findByText('80 kg · 1,6 bultos'),
    ).toBeInTheDocument();
  });

  it('accepts counting zero for an input without movements', async () => {
    renderInputsScreen({ searchParams: '?finca=f1' });
    const dialog = await openMenuAction('Trampas', 'Registrar conteo');

    expect(
      await within(dialog).findByText('Sin movimientos en esta finca'),
    ).toBeInTheDocument();
    await userEvent.type(
      within(dialog).getByLabelText('Cantidad contada (unidades)'),
      '0',
    );
    expect(within(dialog).getByText('Sin diferencia')).toBeInTheDocument();

    await save(dialog, 'Registrar conteo');

    await dialogClosed();
    expect(backend.movements[0]).toMatchObject({ counted_quantity: '0' });
  });

  it('shows next to the date when there are later movements', async () => {
    server.use(
      http.post(apiUrl('/api/input-movements'), () =>
        apiError(400, 'validation_error', 'Datos inválidos.', {
          occurred_on: ['Hay movimientos posteriores a esa fecha.'],
        }),
      ),
    );
    renderInputsScreen({ searchParams: '?finca=f1' });
    const dialog = await openMenuAction('Trampas', 'Registrar conteo');
    await userEvent.type(
      within(dialog).getByLabelText('Cantidad contada (unidades)'),
      '3',
    );

    await save(dialog, 'Registrar conteo');

    expect(
      await within(dialog).findByText(
        'Hay movimientos posteriores a esa fecha.',
      ),
    ).toBeInTheDocument();
    expect(within(dialog).getByLabelText('Fecha')).toHaveAttribute(
      'aria-invalid',
      'true',
    );
  });
});
