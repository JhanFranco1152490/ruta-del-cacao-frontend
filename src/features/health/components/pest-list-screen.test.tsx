import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';

import type { components } from '@/lib/api/schema';
import { queryDialog } from '@/test/dialog';
import { apiError, buildPestDisease } from '@/test/factories';
import { apiUrl } from '@/test/handlers';
import { renderWithProviders } from '@/test/render';
import { server } from '@/test/server';

import { PestListScreen } from './pest-list-screen';

type PestDisease = components['schemas']['PestDisease'];

let catalog: PestDisease[];
let posted: unknown[];
let patched: { id: string; body: unknown }[];
let urls: string[];

// Un backend en memoria: lo que se registra o cambia aparece al volver a pedir la lista.
beforeEach(() => {
  catalog = [
    buildPestDisease({
      id: 'monilia',
      name: 'Monilia',
      kind: 'disease',
      scientific_name: 'Moniliophthora roreri',
      description: 'Solo ataca la mazorca.',
    }),
    buildPestDisease({
      id: 'trips',
      name: 'Trips',
      kind: 'pest',
      scientific_name: 'Selenothrips rubrocinctus',
      description: 'Raspan el envés de las hojas.',
    }),
    buildPestDisease({
      id: 'arriera',
      name: 'Hormiga arriera',
      kind: 'pest',
      scientific_name: null,
      description: 'Cortan hojas y brotes.',
      is_active: false,
    }),
  ];
  posted = [];
  patched = [];
  urls = [];
  server.use(
    http.get(apiUrl('/api/pests-diseases'), () =>
      HttpResponse.json({ results: catalog }),
    ),
    http.post(apiUrl('/api/pests-diseases'), async ({ request }) => {
      const body = (await request.json()) as Partial<PestDisease>;
      posted.push(body);
      const created = buildPestDisease({ id: 'new', ...body });
      catalog = [...catalog, created];
      return HttpResponse.json(created, { status: 201 });
    }),
    http.patch(
      apiUrl('/api/pests-diseases/:id'),
      async ({ params, request }) => {
        const body = (await request.json()) as Partial<PestDisease>;
        patched.push({ id: String(params.id), body });
        catalog = catalog.map((item) =>
          item.id === params.id ? { ...item, ...body } : item,
        );
        return HttpResponse.json(catalog.find((item) => item.id === params.id));
      },
    ),
  );
});

async function renderScreen(searchParams = '') {
  renderWithProviders(<PestListScreen />, {
    searchParams,
    onUrlUpdate: ({ queryString }) => urls.push(queryString),
  });
  // El conteo aparece cuando llega el catálogo, haya o no filas que mostrar.
  await screen.findByText(/^\d+ plagas? (y|o) enfermedad/);
  return userEvent.setup();
}

const shownNames = () =>
  within(screen.getByRole('list', { name: 'Plagas y enfermedades' }))
    .getAllByRole('heading')
    .map((heading) => heading.textContent);

const rowOf = (name: string) =>
  screen.getByRole('heading', { name }).closest('li') as HTMLElement;

const openRegister = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(
    screen.getByRole('button', { name: 'Registrar plaga o enfermedad' }),
  );
  return screen.getByRole('dialog');
};

describe('PestListScreen', () => {
  it('lists the catalog with the kind, scientific name, description and state of each', async () => {
    await renderScreen();

    expect(shownNames()).toEqual(['Monilia', 'Trips', 'Hormiga arriera']);
    const monilia = within(rowOf('Monilia'));
    expect(monilia.getByText('Enfermedad')).toBeInTheDocument();
    expect(monilia.getByText('Moniliophthora roreri')).toBeInTheDocument();
    expect(monilia.getByText('Solo ataca la mazorca.')).toBeInTheDocument();
    expect(monilia.getByText('Activa')).toBeInTheDocument();
    expect(within(rowOf('Trips')).getByText('Plaga')).toBeInTheDocument();
    expect(
      within(rowOf('Hormiga arriera')).getByText('Inactiva'),
    ).toBeInTheDocument();
  });

  it('finds one by its name or its scientific name, however it is written, and keeps the search in the URL', async () => {
    const user = await renderScreen();

    const search = screen.getByLabelText('Buscar plagas y enfermedades');
    await user.type(search, 'moniliophthora');
    expect(shownNames()).toEqual(['Monilia']);
    await waitFor(() => expect(urls.at(-1)).toBe('?buscar=moniliophthora'));

    await user.clear(search);
    await user.type(search, 'HORMIGA  arriera');
    expect(shownNames()).toEqual(['Hormiga arriera']);
  });

  it('opens with the filters of the URL', async () => {
    await renderScreen('?estado=inactivas');

    expect(shownNames()).toEqual(['Hormiga arriera']);
    expect(screen.getByLabelText('Filtrar por estado')).toHaveValue(
      'inactivas',
    );
  });

  it('filters by state', async () => {
    const user = await renderScreen();

    await user.selectOptions(
      screen.getByLabelText('Filtrar por estado'),
      'activas',
    );

    expect(shownNames()).toEqual(['Monilia', 'Trips']);
    await waitFor(() => expect(urls.at(-1)).toBe('?estado=activas'));
  });

  it('says when nothing matches the search', async () => {
    await renderScreen('?buscar=roya');

    expect(
      screen.getByText('Ninguna plaga o enfermedad coincide con la búsqueda'),
    ).toBeInTheDocument();
  });

  it('registers one and shows it in the list', async () => {
    const user = await renderScreen();

    const dialog = await openRegister(user);
    await user.type(
      within(dialog).getByLabelText('Nombre'),
      ' Escoba de bruja ',
    );
    await user.selectOptions(within(dialog).getByLabelText('Tipo'), 'disease');
    await user.type(
      within(dialog).getByLabelText('Descripción'),
      'Los brotes se hinchan y echan muchas ramitas.',
    );
    await user.click(within(dialog).getByRole('button', { name: 'Registrar' }));

    await waitFor(() => expect(queryDialog()).not.toBeInTheDocument());
    expect(posted).toEqual([
      {
        name: 'Escoba de bruja',
        kind: 'disease',
        scientific_name: null,
        description: 'Los brotes se hinchan y echan muchas ramitas.',
      },
    ]);
    expect(
      await screen.findByRole('heading', { name: 'Escoba de bruja' }),
    ).toBeInTheDocument();
    expect(
      await screen.findByText('Plaga o enfermedad registrada'),
    ).toBeInTheDocument();
  });

  it('wants the kind and the description before sending', async () => {
    const user = await renderScreen();

    const dialog = await openRegister(user);
    await user.type(within(dialog).getByLabelText('Nombre'), 'Roya');
    await user.click(within(dialog).getByRole('button', { name: 'Registrar' }));

    expect(
      await within(dialog).findByText('Elige si es plaga o enfermedad.'),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText('Describe cómo se reconoce en campo.'),
    ).toBeInTheDocument();
    expect(posted).toEqual([]);
  });

  it('warns about a repeated name before sending it', async () => {
    const user = await renderScreen();

    const dialog = await openRegister(user);
    await user.type(within(dialog).getByLabelText('Nombre'), 'MONILIA');
    await user.click(within(dialog).getByRole('button', { name: 'Registrar' }));

    expect(
      await within(dialog).findByText(
        'Ya existe una plaga o enfermedad con este nombre',
      ),
    ).toBeInTheDocument();
    expect(posted).toEqual([]);
  });

  it('shows the repeated name the server found next to the field', async () => {
    server.use(
      http.post(apiUrl('/api/pests-diseases'), () =>
        apiError(409, 'duplicate_pest_disease_name', 'Ya existe.'),
      ),
    );
    const user = await renderScreen();

    const dialog = await openRegister(user);
    await user.type(within(dialog).getByLabelText('Nombre'), 'Roya');
    await user.selectOptions(within(dialog).getByLabelText('Tipo'), 'disease');
    await user.type(within(dialog).getByLabelText('Descripción'), 'Manchas.');
    await user.click(within(dialog).getByRole('button', { name: 'Registrar' }));

    await waitFor(() =>
      expect(
        within(dialog).getByLabelText('Nombre'),
      ).toHaveAccessibleDescription(
        'Ya existe una plaga o enfermedad con este nombre',
      ),
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('edits one starting from its current data, and lets its own name stay', async () => {
    const user = await renderScreen();

    await user.click(
      within(rowOf('Trips')).getByRole('button', { name: 'Editar Trips' }),
    );
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByLabelText('Nombre')).toHaveValue('Trips');
    expect(within(dialog).getByLabelText('Tipo')).toHaveValue('pest');
    expect(
      within(dialog).getByLabelText('Nombre científico (opcional)'),
    ).toHaveValue('Selenothrips rubrocinctus');
    const description = within(dialog).getByLabelText('Descripción');
    await user.clear(description);
    await user.type(description, 'Insectos diminutos.');
    await user.click(
      within(dialog).getByRole('button', { name: 'Guardar cambios' }),
    );

    await waitFor(() =>
      expect(patched).toEqual([
        {
          id: 'trips',
          body: {
            name: 'Trips',
            kind: 'pest',
            scientific_name: 'Selenothrips rubrocinctus',
            description: 'Insectos diminutos.',
          },
        },
      ]),
    );
    expect(await screen.findByText('Cambios guardados')).toBeInTheDocument();
  });

  it('deactivates one after confirming', async () => {
    const user = await renderScreen();

    await user.click(
      within(rowOf('Trips')).getByRole('button', { name: 'Desactivar' }),
    );
    expect(screen.getByRole('dialog')).toHaveTextContent(
      'Los monitoreos que ya la tienen no cambian',
    );
    await user.click(screen.getByRole('button', { name: 'Desactivar plaga' }));

    await waitFor(() =>
      expect(patched).toEqual([{ id: 'trips', body: { is_active: false } }]),
    );
    expect(
      await within(rowOf('Trips')).findByText('Inactiva'),
    ).toBeInTheDocument();
  });

  it('activates an inactive one', async () => {
    const user = await renderScreen();

    await user.click(
      within(rowOf('Hormiga arriera')).getByRole('button', { name: 'Activar' }),
    );
    await user.click(screen.getByRole('button', { name: 'Activar plaga' }));

    await waitFor(() =>
      expect(patched).toEqual([{ id: 'arriera', body: { is_active: true } }]),
    );
  });

  it('says the catalog could not be loaded and lets the person retry', async () => {
    let fail = true;
    server.use(
      http.get(apiUrl('/api/pests-diseases'), () =>
        fail
          ? apiError(500, 'server_error')
          : HttpResponse.json({ results: catalog }),
      ),
    );
    renderWithProviders(<PestListScreen />);
    const user = userEvent.setup();

    expect(
      await screen.findByText(
        'No fue posible cargar las plagas y enfermedades.',
      ),
    ).toBeInTheDocument();
    fail = false;
    await user.click(screen.getByRole('button', { name: /reintentar/i }));

    expect(
      await screen.findByRole('heading', { name: 'Monilia' }),
    ).toBeInTheDocument();
  });
});
