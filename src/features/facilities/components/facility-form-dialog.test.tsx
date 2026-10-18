import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { FarmOption } from '@/lib/api/farm-options';
import { apiError, buildFacility } from '@/test/factories';
import { apiUrl, csrfHandler } from '@/test/handlers';
import { renderWithProviders } from '@/test/render';
import { server } from '@/test/server';

import type { PostharvestFacility } from '../api';
import { FacilityFormDialog } from './facility-form-dialog';

const farmOption = (id: string, code: string, name: string): FarmOption => ({
  id,
  code,
  name,
  isActive: true,
  municipality: 'Cúcuta',
  producer: {
    id: 'p1',
    member_code: 'PROD-000007',
    first_name: 'Ana',
    last_name: 'Prueba',
  },
});
const farms = [
  farmOption('f1', 'F01', 'La Esperanza'),
  farmOption('f2', 'F02', 'El Diviso'),
];
const esperanza = {
  id: 'f1',
  code: 'F01',
  name: 'La Esperanza',
  is_active: true,
};
const c02 = buildFacility({ id: 'c2', name: 'C-02', farm: esperanza });

let bodies: { method: string; url: string; body: unknown }[];

beforeEach(() => {
  bodies = [];
});

const capture = (
  method: 'post' | 'patch',
  path: string,
  respond: () => Response,
) =>
  http[method](apiUrl(path), async ({ request }) => {
    bodies.push({ method, url: request.url, body: await request.json() });
    return respond();
  });

function renderDialog({
  facility,
  known = [c02],
}: { facility?: PostharvestFacility; known?: PostharvestFacility[] } = {}) {
  const onSaved = vi.fn();
  const onShowExisting = vi.fn();
  renderWithProviders(
    <FacilityFormDialog
      facility={facility}
      farmId="f1"
      farms={farms}
      known={known}
      onClose={vi.fn()}
      onSaved={onSaved}
      onShowExisting={onShowExisting}
    />,
  );
  return { onSaved, onShowExisting, dialog: screen.getByRole('dialog') };
}

const fill = async (name: string, capacity: string) => {
  await userEvent.type(screen.getByLabelText('Nombre o código'), name);
  await userEvent.type(
    screen.getByLabelText('Capacidad (kg de cacao en baba)'),
    capacity,
  );
};

describe('registering a facility', () => {
  it('registers it in the farm of the list', async () => {
    server.use(
      csrfHandler,
      capture('post', '/api/postharvest-facilities', () =>
        HttpResponse.json(buildFacility(), { status: 201 }),
      ),
    );
    const { onSaved, dialog } = renderDialog();

    expect(
      within(dialog).getByText(
        'Quedará Disponible para iniciar fermentaciones o secados, según su tipo.',
      ),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByLabelText('Marquesina para secar'));
    await fill('M-03', '300');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() =>
      expect(onSaved).toHaveBeenCalledWith('Elemento registrado'),
    );
    expect(bodies[0].body).toEqual({
      farm_id: 'f1',
      facility_type: 'solar_dryer',
      name: 'M-03',
      capacity_kg: '300',
    });
  });

  it('marks each missing field and does not send anything', async () => {
    renderDialog();

    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(
      await screen.findByText('Complete los datos obligatorios'),
    ).toBeInTheDocument();
    expect(screen.getAllByText('Campo obligatorio')).toHaveLength(3);
    expect(bodies).toEqual([]);
  });

  it('warns of a name used in the farm before sending, and shows the existing one', async () => {
    const { onShowExisting } = renderDialog();

    await userEvent.click(screen.getByLabelText('Cajón para fermentar'));
    await fill('c 02', '600');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(
      await screen.findByText('Ya existe C-02 en La Esperanza.'),
    ).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole('button', { name: 'Ver el elemento' }),
    );
    expect(onShowExisting).toHaveBeenCalledWith('c2');
    expect(bodies).toEqual([]);
  });

  it('offers activating an inactive facility the server says has the name', async () => {
    const inactive = buildFacility({
      id: 'c9',
      name: 'C-09',
      farm: esperanza,
      is_active: false,
      status: 'inactive',
      version: 3,
    });
    server.use(
      csrfHandler,
      http.post(apiUrl('/api/postharvest-facilities'), () =>
        HttpResponse.json(
          {
            detail: 'Ya existe.',
            code: 'duplicate_facility_name',
            fields: {},
            existing: {
              id: 'c9',
              name: 'C-09',
              facility_type: 'fermentation_box',
              is_active: false,
            },
          },
          { status: 409 },
        ),
      ),
      capture('patch', '/api/postharvest-facilities/c9', () =>
        HttpResponse.json({
          ...inactive,
          is_active: true,
          status: 'available',
        }),
      ),
    );
    // La copia del dispositivo es anterior: el aviso llega del servidor.
    const { onSaved, onShowExisting } = renderDialog({
      known: [c02, { ...inactive, name: 'C-9 viejo' }],
    });

    await userEvent.click(screen.getByLabelText('Cajón para fermentar'));
    await fill('C-09', '600');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(await screen.findByText('C-09 está inactivo.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Activarlo' }));

    await waitFor(() =>
      expect(onSaved).toHaveBeenCalledWith('Cajón C-09 activado'),
    );
    expect(bodies[0].body).toEqual({ is_active: true, expected_version: 3 });
    expect(onShowExisting).toHaveBeenCalledWith('c9');
  });

  it('says it next to the farm when the farm became inactive', async () => {
    server.use(
      csrfHandler,
      http.post(apiUrl('/api/postharvest-facilities'), () =>
        apiError(422, 'farm_inactive'),
      ),
    );
    renderDialog();

    await userEvent.click(screen.getByLabelText('Cajón para fermentar'));
    await fill('C-04', '600');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(
      await screen.findByText(
        'La finca está inactiva: no se registran cajones ni marquesinas en ella.',
      ),
    ).toBeInTheDocument();
  });
});

describe('editing a facility', () => {
  const used = buildFacility({
    id: 'c1',
    name: 'C-4',
    capacity_kg: '600.0',
    farm: esperanza,
    has_records: true,
    version: 5,
  });

  it('keeps the farm fixed and the type locked when it was used', () => {
    const { dialog } = renderDialog({ facility: used });

    expect(
      within(dialog).getByRole('heading', { name: 'Editar cajón C-4' }),
    ).toBeInTheDocument();
    expect(within(dialog).getByText('F01 · La Esperanza')).toBeInTheDocument();
    expect(screen.getByLabelText('Cajón para fermentar')).toBeDisabled();
    expect(
      screen.getByText(
        'No se puede cambiar: el elemento ya se usó en un proceso. Si te equivocaste, desactívalo y registra otro.',
      ),
    ).toBeInTheDocument();
  });

  it('sends only what changed, with the version read', async () => {
    server.use(
      csrfHandler,
      capture('patch', '/api/postharvest-facilities/c1', () =>
        HttpResponse.json({ ...used, name: 'C-04' }),
      ),
    );
    const { onSaved } = renderDialog({ facility: used });

    const name = screen.getByLabelText('Nombre o código');
    await userEvent.clear(name);
    await userEvent.type(name, 'C-04');
    await userEvent.click(
      screen.getByRole('button', { name: 'Guardar cambios' }),
    );

    await waitFor(() =>
      expect(onSaved).toHaveBeenCalledWith('Elemento actualizado'),
    );
    expect(bodies[0].body).toEqual({ name: 'C-04', expected_version: 5 });
  });

  it('closes without sending when nothing changed', async () => {
    const { onSaved } = renderDialog({ facility: used });

    await userEvent.click(
      screen.getByRole('button', { name: 'Guardar cambios' }),
    );

    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(null));
    expect(bodies).toEqual([]);
  });

  it('loads the current values when someone else changed it first', async () => {
    const fresh = buildFacility({ id: 'c2', name: 'C-02', farm: esperanza });
    server.use(
      csrfHandler,
      http.patch(apiUrl('/api/postharvest-facilities/c2'), () =>
        HttpResponse.json(
          {
            detail: 'Cambió.',
            code: 'stale_version',
            fields: {},
            current: { ...fresh, capacity_kg: '800.0', version: 7 },
          },
          { status: 409 },
        ),
      ),
    );
    renderDialog({ facility: fresh });

    const capacity = screen.getByLabelText('Capacidad (kg de cacao en baba)');
    await userEvent.clear(capacity);
    await userEvent.type(capacity, '650');
    await userEvent.click(
      screen.getByRole('button', { name: 'Guardar cambios' }),
    );

    expect(
      await screen.findByText(
        'Otra persona cambió este elemento. Revisa los datos actuales antes de guardar.',
      ),
    ).toBeInTheDocument();
    expect(capacity).toHaveValue('800');
  });
});
