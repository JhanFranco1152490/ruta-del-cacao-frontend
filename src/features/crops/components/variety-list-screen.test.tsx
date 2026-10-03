import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';

import type { components } from '@/lib/api/schema';
import { apiError, buildCacaoVariety } from '@/test/factories';
import { apiUrl } from '@/test/handlers';
import { renderWithProviders } from '@/test/render';
import { server } from '@/test/server';

import { VarietyListScreen } from './variety-list-screen';

type CacaoVariety = components['schemas']['CacaoVariety'];

let catalog: CacaoVariety[];
let posted: unknown[];
let patched: { id: string; body: unknown }[];

// Un backend en memoria: lo que se registra o cambia aparece al volver a pedir la lista.
beforeEach(() => {
  catalog = [
    buildCacaoVariety({
      id: 'ccn',
      name: 'CCN-51',
      description: 'Procedencia: Ecuador.',
    }),
    buildCacaoVariety({
      id: 'ics',
      name: 'ICS-95',
      description: 'Procedencia: Trinidad.',
    }),
    buildCacaoVariety({
      id: 'scc',
      name: 'SCC-61',
      description: 'Procedencia: Colombia.',
      is_active: false,
    }),
  ];
  posted = [];
  patched = [];
  server.use(
    http.get(apiUrl('/api/cacao-varieties'), () =>
      HttpResponse.json({ results: catalog }),
    ),
    http.post(apiUrl('/api/cacao-varieties'), async ({ request }) => {
      const body = (await request.json()) as {
        name: string;
        description: string;
      };
      posted.push(body);
      const created = buildCacaoVariety({ id: 'new', ...body });
      catalog = [...catalog, created];
      return HttpResponse.json(created, { status: 201 });
    }),
    http.patch(
      apiUrl('/api/cacao-varieties/:id'),
      async ({ params, request }) => {
        const body = (await request.json()) as Partial<CacaoVariety>;
        patched.push({ id: String(params.id), body });
        catalog = catalog.map((variety) =>
          variety.id === params.id ? { ...variety, ...body } : variety,
        );
        return HttpResponse.json(
          catalog.find((variety) => variety.id === params.id),
        );
      },
    ),
  );
});

async function renderScreen() {
  renderWithProviders(<VarietyListScreen />);
  await screen.findByRole('heading', { name: 'CCN-51' });
  return userEvent.setup();
}

const shownNames = () =>
  within(screen.getByRole('list', { name: 'Variedades' }))
    .getAllByRole('heading')
    .map((heading) => heading.textContent);

const rowOf = (name: string) =>
  screen.getByRole('heading', { name }).closest('li') as HTMLElement;

describe('VarietyListScreen', () => {
  it('lists the whole catalog with the state of each variety', async () => {
    await renderScreen();

    expect(shownNames()).toEqual(['CCN-51', 'ICS-95', 'SCC-61']);
    expect(within(rowOf('ICS-95')).getByText('Activa')).toBeInTheDocument();
    expect(within(rowOf('SCC-61')).getByText('Inactiva')).toBeInTheDocument();
    expect(
      within(rowOf('ICS-95')).getByText('Procedencia: Trinidad.'),
    ).toBeInTheDocument();
  });

  it('finds a variety however its name is written, and by its origin', async () => {
    const user = await renderScreen();
    const search = screen.getByLabelText('Buscar variedades');

    await user.type(search, 'ccn 51');
    expect(shownNames()).toEqual(['CCN-51']);

    await user.clear(search);
    await user.type(search, 'trinidad');
    expect(shownNames()).toEqual(['ICS-95']);
  });

  it('filters by state', async () => {
    const user = await renderScreen();

    await user.selectOptions(
      screen.getByLabelText('Filtrar por estado'),
      'inactive',
    );
    expect(shownNames()).toEqual(['SCC-61']);

    await user.selectOptions(
      screen.getByLabelText('Filtrar por estado'),
      'active',
    );
    expect(shownNames()).toEqual(['CCN-51', 'ICS-95']);
  });

  it('says when nothing matches the search', async () => {
    const user = await renderScreen();

    await user.type(screen.getByLabelText('Buscar variedades'), 'xyz');

    expect(
      screen.getByText('Ninguna variedad coincide con la búsqueda'),
    ).toBeInTheDocument();
  });

  it('registers a new variety and shows it in the list', async () => {
    const user = await renderScreen();

    await user.click(
      screen.getByRole('button', { name: 'Registrar variedad' }),
    );
    const dialog = screen.getByRole('dialog');
    await user.type(within(dialog).getByLabelText('Nombre'), ' FEAR-5 ');
    await user.type(
      within(dialog).getByLabelText('Descripción (opcional)'),
      'Procedencia: Colombia.',
    );
    await user.click(
      within(dialog).getByRole('button', { name: 'Registrar variedad' }),
    );

    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
    expect(posted).toEqual([
      { name: 'FEAR-5', description: 'Procedencia: Colombia.' },
    ]);
    expect(
      await screen.findByRole('heading', { name: 'FEAR-5' }),
    ).toBeInTheDocument();
  });

  it('warns about a repeated name before sending it', async () => {
    const user = await renderScreen();

    await user.click(
      screen.getByRole('button', { name: 'Registrar variedad' }),
    );
    const dialog = screen.getByRole('dialog');
    await user.type(within(dialog).getByLabelText('Nombre'), 'ccn 51');
    await user.click(
      within(dialog).getByRole('button', { name: 'Registrar variedad' }),
    );

    expect(
      await within(dialog).findByText('Ya existe una variedad con este nombre'),
    ).toBeInTheDocument();
    expect(posted).toEqual([]);
  });

  it('shows the repeated name the server found next to the field', async () => {
    server.use(
      http.post(apiUrl('/api/cacao-varieties'), () =>
        apiError(409, 'duplicate_variety_name', 'Ya existe.', {
          name: ['Ya existe.'],
        }),
      ),
    );
    const user = await renderScreen();

    await user.click(
      screen.getByRole('button', { name: 'Registrar variedad' }),
    );
    const dialog = screen.getByRole('dialog');
    await user.type(within(dialog).getByLabelText('Nombre'), 'EET-8');
    await user.click(
      within(dialog).getByRole('button', { name: 'Registrar variedad' }),
    );

    expect(within(dialog).getByLabelText('Nombre')).toHaveAccessibleDescription(
      'Ya existe una variedad con este nombre',
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('edits a variety starting from its current data', async () => {
    const user = await renderScreen();

    await user.click(
      within(rowOf('ICS-95')).getByRole('button', { name: 'Editar ICS-95' }),
    );
    const dialog = screen.getByRole('dialog');
    const description = within(dialog).getByLabelText('Descripción (opcional)');
    expect(within(dialog).getByLabelText('Nombre')).toHaveValue('ICS-95');
    expect(description).toHaveValue('Procedencia: Trinidad.');

    await user.clear(description);
    await user.type(description, 'Trinidad. Autocompatible.');
    await user.click(
      within(dialog).getByRole('button', { name: 'Guardar cambios' }),
    );

    await waitFor(() =>
      expect(patched).toEqual([
        {
          id: 'ics',
          body: { name: 'ICS-95', description: 'Trinidad. Autocompatible.' },
        },
      ]),
    );
    expect(
      await screen.findByText('Trinidad. Autocompatible.'),
    ).toBeInTheDocument();
  });

  it('lets the same name stay when editing that variety', async () => {
    const user = await renderScreen();

    await user.click(
      within(rowOf('CCN-51')).getByRole('button', { name: 'Editar CCN-51' }),
    );
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: 'Guardar cambios',
      }),
    );

    await waitFor(() => expect(patched).toHaveLength(1));
  });

  it('deactivates a variety after confirming', async () => {
    const user = await renderScreen();

    await user.click(
      within(rowOf('ICS-95')).getByRole('button', { name: 'Desactivar' }),
    );
    await user.click(
      screen.getByRole('button', { name: 'Desactivar variedad' }),
    );

    await waitFor(() =>
      expect(patched).toEqual([{ id: 'ics', body: { is_active: false } }]),
    );
    expect(
      await within(rowOf('ICS-95')).findByText('Inactiva'),
    ).toBeInTheDocument();
  });

  it('activates an inactive variety', async () => {
    const user = await renderScreen();

    await user.click(
      within(rowOf('SCC-61')).getByRole('button', { name: 'Activar' }),
    );
    await user.click(screen.getByRole('button', { name: 'Activar variedad' }));

    await waitFor(() =>
      expect(patched).toEqual([{ id: 'scc', body: { is_active: true } }]),
    );
  });

  it('says the catalog could not be loaded and lets the person retry', async () => {
    let fail = true;
    server.use(
      http.get(apiUrl('/api/cacao-varieties'), () =>
        fail
          ? apiError(500, 'server_error')
          : HttpResponse.json({ results: catalog }),
      ),
    );
    renderWithProviders(<VarietyListScreen />);
    const user = userEvent.setup();

    expect(
      await screen.findByText('No fue posible cargar las variedades.'),
    ).toBeInTheDocument();
    fail = false;
    await user.click(screen.getByRole('button', { name: /reintentar/i }));

    expect(
      await screen.findByRole('heading', { name: 'CCN-51' }),
    ).toBeInTheDocument();
  });
});
