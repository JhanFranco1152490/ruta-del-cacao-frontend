import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';

import { apiError, buildAgriculturalInput } from '@/test/factories';
import { apiUrl } from '@/test/handlers';
import { listedOptions, pick } from '@/test/search-select';
import { chooseFromActionsMenu } from '@/test/menu';
import { server } from '@/test/server';

import {
  type InputsBackend,
  renderInputsScreen,
  startInputsBackend,
} from './inputs-test-kit';

// Lo que cambia para un empleado: ve los insumos de sus fincas, trae los de otras con una entrada,
// dice en qué finca queda un insumo nuevo si trabaja en varias y nunca cambia la unidad.

const EMPLOYEE = {
  all_farms: false,
  farms: [{ id: 'f1', code: 'F01', name: 'La Esperanza', is_active: true }],
};
const TWO_FARMS = [
  { id: 'f1', code: 'F01', name: 'La Esperanza', is_active: true },
  { id: 'f2', code: 'F01', name: 'Catalina', is_active: true },
];

const urea = buildAgriculturalInput({ id: 'urea', name: 'Urea', version: 1 });
const fungicide = {
  id: 'fungicide',
  name: 'Fungicida',
  input_type: 'fungicide',
  unit: 'l',
  package_type: null,
  package_size: null,
};

let backend: InputsBackend;
let searches: URLSearchParams[];

beforeEach(() => {
  backend = startInputsBackend([urea]);
  searches = [];
  server.use(
    http.get(apiUrl('/api/agricultural-inputs/catalog'), ({ request }) => {
      searches.push(new URL(request.url).searchParams);
      return HttpResponse.json({ results: [fungicide] });
    }),
  );
});

describe('un empleado en la pantalla de insumos', () => {
  it('trae con una entrada un insumo que está en otra finca', async () => {
    renderInputsScreen({ user: EMPLOYEE });

    await userEvent.click(
      await screen.findByRole('button', { name: /Entrada de otro insumo/ }),
    );
    await userEvent.type(
      await screen.findByLabelText('Buscar en el catálogo'),
      'fungi',
    );
    await userEvent.click(
      await screen.findByRole('button', { name: /Fungicida/ }),
    );

    const dialog = await screen.findByRole('dialog', {
      name: /Registrar entrada: Fungicida/,
    });
    await pick('Finca', 'La Esperanza', dialog);
    await userEvent.type(within(dialog).getByLabelText(/^Cantidad/), '5');
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Registrar entrada' }),
    );

    expect(await screen.findByText('Entrada registrada')).toBeVisible();
    expect(backend.movements[0]).toMatchObject({
      input_id: 'fungicide',
      farm_id: 'f1',
      kind: 'entry',
    });
    expect(searches.at(-1)?.get('search')).toBe('fungi');
  });

  it('ve fija la finca en la que trabaja, sin un total de todas', async () => {
    renderInputsScreen({ user: EMPLOYEE });

    const farm = await screen.findByRole('combobox', { name: 'Finca' });
    expect(farm).toBeDisabled();
    expect(farm).toHaveValue('La Esperanza');
  });

  it('elige entre sus fincas si trabaja en varias', async () => {
    renderInputsScreen({
      user: { ...EMPLOYEE, farms: TWO_FARMS },
      farms: TWO_FARMS,
    });

    expect(
      await screen.findByRole('combobox', { name: 'Finca' }),
    ).toBeEnabled();
    expect(await listedOptions('Finca')).toEqual([
      'Todas las fincas',
      'La Esperanza',
      'Catalina',
    ]);
  });

  it('no lo ofrece al productor, que ya ve todo el catálogo', async () => {
    renderInputsScreen();

    expect(
      await screen.findByRole('button', { name: /Registrar insumo/ }),
    ).toBeVisible();
    expect(
      screen.queryByRole('button', { name: /Entrada de otro insumo/ }),
    ).not.toBeInTheDocument();
  });

  it('elige la finca de un insumo nuevo si trabaja en varias', async () => {
    renderInputsScreen({
      user: { ...EMPLOYEE, farms: TWO_FARMS },
      farms: TWO_FARMS,
    });
    await userEvent.click(
      await screen.findByRole('button', { name: /Registrar insumo/ }),
    );
    const dialog = await screen.findByRole('dialog');
    await userEvent.type(within(dialog).getByLabelText('Nombre'), 'Cobre');
    await userEvent.selectOptions(
      within(dialog).getByLabelText('Tipo de insumo'),
      'Fungicida',
    );
    await userEvent.selectOptions(
      within(dialog).getByLabelText('Unidad de medida'),
      'Kilogramos',
    );
    const save = within(dialog).getByRole('button', {
      name: 'Registrar insumo',
    });

    await userEvent.click(save);
    expect(backend.posted).toEqual([]);

    await userEvent.selectOptions(
      within(dialog).getByLabelText('Finca'),
      'Catalina',
    );
    await userEvent.click(save);

    expect(await screen.findByText('Insumo guardado con éxito')).toBeVisible();
    expect(backend.posted[0]).toMatchObject({ name: 'Cobre', farm_id: 'f2' });
  });

  it('no pregunta la finca si trabaja en una sola', async () => {
    renderInputsScreen({ user: EMPLOYEE });
    await userEvent.click(
      await screen.findByRole('button', { name: /Registrar insumo/ }),
    );

    const dialog = await screen.findByRole('dialog');

    expect(within(dialog).queryByLabelText('Finca')).not.toBeInTheDocument();
  });

  it('ve la unidad sin poder cambiarla', async () => {
    renderInputsScreen({ user: EMPLOYEE });
    await chooseFromActionsMenu(userEvent.setup(), 'Editar');

    const unit = await screen.findByLabelText('Unidad de medida');

    expect(unit).toBeDisabled();
    expect(
      screen.getByText('Solo el productor cambia la unidad de un insumo.'),
    ).toBeVisible();
  });

  it('explica que un insumo compartido con otra finca solo lo edita el productor', async () => {
    server.use(
      http.patch(apiUrl('/api/agricultural-inputs/:id'), () =>
        apiError(409, 'input_shared'),
      ),
    );
    renderInputsScreen({ user: EMPLOYEE });
    await chooseFromActionsMenu(userEvent.setup(), 'Editar');
    const name = await screen.findByLabelText('Nombre');
    await userEvent.clear(name);
    await userEvent.type(name, 'Urea 46');

    await userEvent.click(
      screen.getByRole('button', { name: 'Guardar cambios' }),
    );

    expect(await screen.findByText(/también está en otra finca/)).toBeVisible();
  });
});
