import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { delay, http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';

import type { components } from '@/lib/api/schema';
import { apiError, buildAgriculturalInput } from '@/test/factories';
import { apiUrl } from '@/test/handlers';
import { server } from '@/test/server';

import {
  type InputsBackend,
  renderInputsScreen,
  startInputsBackend,
} from './inputs-test-kit';

type SessionUser = components['schemas']['SessionUser'];

let backend: InputsBackend;
let urls: string[];

beforeEach(() => {
  backend = startInputsBackend();
});

function renderScreen(user: Partial<SessionUser> = {}, searchParams = '') {
  ({ urls } = renderInputsScreen({ user, searchParams }));
}

const dialog = () => screen.findByRole('dialog');

async function openRegister() {
  await userEvent.click(
    await screen.findByRole('button', { name: 'Registrar insumo' }),
  );
  return dialog();
}

async function openEdit(name = 'Urea 46 %') {
  await userEvent.click(
    await screen.findByRole('button', { name: `Editar ${name}` }),
  );
  return dialog();
}

async function fillNew(
  form: HTMLElement,
  { name = 'Oxicloruro de cobre', type = 'fungicide', unit = 'g' } = {},
) {
  await userEvent.type(within(form).getByLabelText('Nombre'), name);
  await userEvent.selectOptions(
    within(form).getByLabelText('Tipo de insumo'),
    type,
  );
  await userEvent.selectOptions(
    within(form).getByLabelText('Unidad de medida'),
    unit,
  );
}

const save = (form: HTMLElement, name = 'Registrar insumo') =>
  userEvent.click(within(form).getByRole('button', { name }));

describe('InputFormDialog', () => {
  it('opens with the focus on the name and marks each missing field', async () => {
    renderScreen();
    const form = await openRegister();

    expect(within(form).getByLabelText('Nombre')).toHaveFocus();

    await save(form);

    expect(
      await within(form).findByText('Complete los datos obligatorios'),
    ).toBeInTheDocument();
    for (const label of ['Nombre', 'Tipo de insumo', 'Unidad de medida']) {
      expect(within(form).getByLabelText(label)).toHaveAttribute(
        'aria-invalid',
        'true',
      );
    }
    expect(within(form).getAllByText('Campo obligatorio')).toHaveLength(3);
    expect(backend.posted).toHaveLength(0);
  });

  it('registers an input with its package and confirms it', async () => {
    renderScreen();
    const form = await openRegister();
    await fillNew(form, { unit: 'ml' });

    expect(within(form).queryByLabelText(/Contenido/)).not.toBeInTheDocument();
    await userEvent.selectOptions(
      within(form).getByLabelText('Empaque'),
      'tub',
    );
    await userEvent.type(
      within(form).getByLabelText('Contenido (mL)'),
      '100,5',
    );
    await save(form);

    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
    expect(backend.posted).toEqual([
      {
        name: 'Oxicloruro de cobre',
        input_type: 'fungicide',
        unit: 'ml',
        package_type: 'tub',
        package_size: '100.5',
      },
    ]);
    expect(await screen.findByRole('status', { name: '' })).toHaveTextContent(
      'Insumo guardado con éxito',
    );
    expect(await screen.findByText('Oxicloruro de cobre')).toBeInTheDocument();
  });

  it('asks for the content when a package is chosen, and forgets it when the package is removed', async () => {
    renderScreen();
    const form = await openRegister();
    await fillNew(form);
    const packageField = within(form).getByLabelText('Empaque');

    await userEvent.selectOptions(packageField, 'sack');
    await save(form);
    expect(await within(form).findByLabelText('Contenido (g)')).toHaveAttribute(
      'aria-invalid',
      'true',
    );

    await userEvent.type(within(form).getByLabelText('Contenido (g)'), '50');
    await userEvent.selectOptions(packageField, '');
    await save(form);

    await waitFor(() => expect(backend.posted).toHaveLength(1));
    expect(backend.posted[0]).toMatchObject({
      package_type: null,
      package_size: null,
    });
  });

  it('warns about a repeated name before sending and shows the existing input', async () => {
    renderScreen();
    const form = await openRegister();
    await fillNew(form, { name: 'urea 46%', type: 'fertilizer', unit: 'kg' });

    await save(form);

    expect(
      await within(form).findByText(
        'Ya existe un insumo con este nombre y tipo',
      ),
    ).toBeInTheDocument();
    expect(backend.posted).toHaveLength(0);

    await userEvent.click(
      within(form).getByRole('button', { name: 'Ver el insumo existente' }),
    );

    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
    expect(urls.at(-1)).toContain('estado=all');
    expect(urls.at(-1)).toContain('tipo=fertilizer');
  });

  it('offers to activate an inactive input with the repeated name', async () => {
    backend.catalog = [
      buildAgriculturalInput({ id: 'old', is_active: false, version: 4 }),
    ];
    renderScreen({}, '?estado=all');
    const form = await openRegister();
    await fillNew(form, { name: 'Urea 46 %', type: 'fertilizer', unit: 'kg' });
    await save(form);

    await userEvent.click(
      await within(form).findByRole('button', { name: 'Activarlo' }),
    );

    await waitFor(() =>
      expect(backend.patched).toEqual([
        { id: 'old', body: { is_active: true, expected_version: 4 } },
      ]),
    );
    expect(await screen.findByText('Insumo activado')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows the duplicate the server finds, with the link', async () => {
    server.use(
      http.post(apiUrl('/api/agricultural-inputs'), () =>
        HttpResponse.json(
          {
            detail: 'Ya existe.',
            code: 'duplicate_input',
            fields: {},
            existing: {
              id: 'other',
              name: 'Sulfato',
              input_type: 'fungicide',
              is_active: true,
            },
          },
          { status: 409 },
        ),
      ),
    );
    renderScreen();
    const form = await openRegister();
    await fillNew(form, { name: 'Sulfato' });

    await save(form);

    expect(
      await within(form).findByRole('button', {
        name: 'Ver el insumo existente',
      }),
    ).toBeInTheDocument();
    expect(within(form).getByLabelText('Nombre')).toHaveValue('Sulfato');
  });

  it('keeps what was written when the save fails, and places field errors', async () => {
    server.use(
      http.post(apiUrl('/api/agricultural-inputs'), () =>
        apiError(400, 'validation_error', 'Datos inválidos.', {
          name: ['Usa máximo 80 caracteres.'],
        }),
      ),
    );
    renderScreen();
    const form = await openRegister();
    await fillNew(form);

    await save(form);

    expect(
      await within(form).findByText('Usa máximo 80 caracteres.'),
    ).toBeInTheDocument();
    expect(within(form).getByLabelText('Nombre')).toHaveValue(
      'Oxicloruro de cobre',
    );
  });

  it('disables saving while the request is in flight', async () => {
    server.use(
      http.post(apiUrl('/api/agricultural-inputs'), async () => {
        await delay('infinite');
        return HttpResponse.json({});
      }),
    );
    renderScreen();
    const form = await openRegister();
    await fillNew(form);

    await save(form);

    expect(
      await within(form).findByRole('button', { name: /Guardando/ }),
    ).toBeDisabled();
  });

  it('edits with the current values and the read version', async () => {
    renderScreen();
    const form = await openEdit();

    expect(within(form).getByLabelText('Nombre')).toHaveValue('Urea 46 %');
    expect(within(form).getByLabelText('Contenido (kg)')).toHaveValue('50');

    await userEvent.clear(within(form).getByLabelText('Nombre'));
    await userEvent.type(within(form).getByLabelText('Nombre'), 'Urea');
    await save(form, 'Guardar cambios');

    await waitFor(() => expect(backend.patched).toHaveLength(1));
    expect(backend.patched[0].body).toEqual({
      name: 'Urea',
      input_type: 'fertilizer',
      unit: 'kg',
      package_type: 'sack',
      package_size: '50',
      expected_version: 2,
    });
    expect(await screen.findByText('Insumo actualizado')).toBeInTheDocument();
  });

  it('locks the unit of an input with records but lets the rest change', async () => {
    backend.catalog = [
      buildAgriculturalInput({ id: 'urea', has_records: true }),
    ];
    renderScreen();
    const form = await openEdit();

    expect(within(form).getByLabelText('Unidad de medida')).toBeDisabled();
    expect(
      within(form).getByText(
        'No se puede cambiar: el insumo ya tiene movimientos o se usó en registros',
      ),
    ).toBeInTheDocument();
    expect(within(form).getByLabelText('Empaque')).toBeEnabled();

    await save(form, 'Guardar cambios');

    await waitFor(() => expect(backend.patched).toHaveLength(1));
    expect(backend.patched[0].body.unit).toBe('kg');
  });

  it('locks the unit when the server says it was used meanwhile', async () => {
    server.use(
      http.patch(apiUrl('/api/agricultural-inputs/urea'), () =>
        apiError(422, 'input_unit_locked'),
      ),
    );
    renderScreen();
    const form = await openEdit();
    await userEvent.selectOptions(
      within(form).getByLabelText('Unidad de medida'),
      'g',
    );

    await save(form, 'Guardar cambios');

    await waitFor(() =>
      expect(within(form).getByLabelText('Unidad de medida')).toBeDisabled(),
    );
    expect(within(form).getByLabelText('Unidad de medida')).toHaveValue('kg');
  });

  it('loads the current values when someone else changed the input first', async () => {
    let attempts = 0;
    server.use(
      http.patch(
        apiUrl('/api/agricultural-inputs/urea'),
        async ({ request }) => {
          attempts += 1;
          const body = (await request.json()) as Record<string, unknown>;
          if (attempts === 1) {
            return HttpResponse.json(
              {
                detail: 'Cambió.',
                code: 'stale_version',
                fields: {},
                current: buildAgriculturalInput({
                  id: 'urea',
                  name: 'Urea granulada',
                  version: 5,
                }),
              },
              { status: 409 },
            );
          }
          backend.patched.push({ id: 'urea', body });
          return HttpResponse.json(buildAgriculturalInput({ version: 6 }));
        },
      ),
    );
    renderScreen();
    const form = await openEdit();
    await userEvent.type(within(form).getByLabelText('Nombre'), ' x');

    await save(form, 'Guardar cambios');

    expect(
      await within(form).findByText(
        'Otra persona cambió este insumo. Revisa los datos actuales antes de guardar.',
      ),
    ).toBeInTheDocument();
    expect(within(form).getByLabelText('Nombre')).toHaveValue('Urea granulada');

    await save(form, 'Guardar cambios');

    await waitFor(() => expect(backend.patched).toHaveLength(1));
    expect(backend.patched[0].body.expected_version).toBe(5);
  });

  it('makes the technical account choose the producer of a new input', async () => {
    server.use(
      http.get(apiUrl('/api/producers'), () =>
        HttpResponse.json({
          count: 0,
          next: null,
          previous: null,
          results: [],
        }),
      ),
    );
    renderScreen({ is_superuser: true, producer_id: null });
    const form = await openRegister();
    await fillNew(form);

    await save(form);

    expect(
      await within(form).findByText('Complete los datos obligatorios'),
    ).toBeInTheDocument();
    expect(within(form).getByText('Campo obligatorio')).toBeInTheDocument();
    expect(backend.posted).toHaveLength(0);
  });

  it('sends the producer chosen in the list for the technical account', async () => {
    server.use(
      http.get(apiUrl('/api/producers/p2'), () =>
        HttpResponse.json({
          id: 'p2',
          first_name: 'Otra',
          last_name: 'Productora',
          member_code: 'ASO-002',
        }),
      ),
      http.get(apiUrl('/api/producers'), () =>
        HttpResponse.json({
          count: 0,
          next: null,
          previous: null,
          results: [],
        }),
      ),
    );
    renderScreen({ is_superuser: true, producer_id: null }, '?productor=p2');
    const form = await openRegister();
    await fillNew(form);

    await save(form);

    await waitFor(() => expect(backend.posted).toHaveLength(1));
    expect(backend.posted[0]).toMatchObject({ producer_id: 'p2' });
  });

  it('closes without saving with Cancel', async () => {
    renderScreen();
    const form = await openRegister();
    await fillNew(form);

    await userEvent.click(
      within(form).getByRole('button', { name: 'Cancelar' }),
    );

    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
    expect(backend.posted).toHaveLength(0);
  });
});
