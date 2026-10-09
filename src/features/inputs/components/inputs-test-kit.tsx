import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';

import { queryKeys } from '@/lib/api/query-keys';
import type { components } from '@/lib/api/schema';
import { PERMISSIONS } from '@/lib/permissions';
import { buildAgriculturalInput, buildSession } from '@/test/factories';
import { apiUrl } from '@/test/handlers';
import { createTestQueryClient, renderWithProviders } from '@/test/render';
import { server } from '@/test/server';

import { InputListScreen } from './input-list-screen';

// Utilidades de las pruebas de la pantalla de insumos y sus diálogos. No es un archivo de pruebas.

type AgriculturalInput = components['schemas']['AgriculturalInput'];
type InputStock = components['schemas']['InputStock'];
type SessionUser = components['schemas']['SessionUser'];

export const ALL_INPUT_PERMISSIONS = [
  PERMISSIONS.INPUTS_VIEW,
  PERMISSIONS.INPUTS_ADD,
  PERMISSIONS.INPUTS_CHANGE,
  PERMISSIONS.INPUTS_DELETE,
  PERMISSIONS.INPUTS_MANAGE_STOCK,
];

export type InputsBackend = {
  catalog: AgriculturalInput[];
  stocks: InputStock[];
  posted: Record<string, unknown>[];
  patched: { id: string; body: Record<string, unknown> }[];
  deleted: { id: string; expectedVersion: string | null }[];
  movements: Record<string, unknown>[];
};

// Un backend en memoria: lo que se registra o cambia aparece al volver a pedir la lista.
export function startInputsBackend(
  catalog: AgriculturalInput[] = [
    buildAgriculturalInput({ id: 'urea', version: 2 }),
  ],
  stocks: InputStock[] = [],
): InputsBackend {
  const backend: InputsBackend = {
    catalog,
    stocks,
    posted: [],
    patched: [],
    deleted: [],
    movements: [],
  };
  server.use(
    http.get(apiUrl('/api/agricultural-inputs'), () =>
      HttpResponse.json({ results: backend.catalog }),
    ),
    http.post(apiUrl('/api/agricultural-inputs'), async ({ request }) => {
      const body = (await request.json()) as Record<string, unknown>;
      backend.posted.push(body);
      const created = buildAgriculturalInput({
        ...(body as Partial<AgriculturalInput>),
        id: 'new',
      });
      backend.catalog = [...backend.catalog, created];
      return HttpResponse.json(created, { status: 201 });
    }),
    http.patch(
      apiUrl('/api/agricultural-inputs/:id'),
      async ({ params, request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        backend.patched.push({ id: String(params.id), body });
        const { expected_version: version, ...changes } = body;
        backend.catalog = backend.catalog.map((input) =>
          input.id === params.id
            ? { ...input, ...changes, version: Number(version) + 1 }
            : input,
        );
        return HttpResponse.json(
          backend.catalog.find((input) => input.id === params.id),
        );
      },
    ),
    http.delete(
      apiUrl('/api/agricultural-inputs/:id'),
      ({ params, request }) => {
        backend.deleted.push({
          id: String(params.id),
          expectedVersion: new URL(request.url).searchParams.get(
            'expected_version',
          ),
        });
        backend.catalog = backend.catalog.filter(
          (input) => input.id !== params.id,
        );
        return new HttpResponse(null, { status: 204 });
      },
    ),
    http.get(apiUrl('/api/input-stocks'), () =>
      HttpResponse.json({ results: backend.stocks }),
    ),
  );
  return backend;
}

export function renderInputsScreen({
  user = {},
  searchParams = '',
}: { user?: Partial<SessionUser>; searchParams?: string } = {}) {
  const urls: string[] = [];
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(
    queryKeys.session(),
    buildSession({
      id: `inputs-${crypto.randomUUID()}`,
      permissions: ALL_INPUT_PERMISSIONS,
      ...user,
    }),
  );
  renderWithProviders(
    <InputListScreen
      farms={{
        choices: [{ id: 'f1', name: 'La Esperanza', is_active: true }],
        isLoading: false,
      }}
    />,
    {
      queryClient,
      searchParams,
      onUrlUpdate: ({ queryString }) => urls.push(queryString),
    },
  );
  return { urls };
}

// Abre una acción del menú "Más acciones" de un insumo y devuelve su diálogo.
export async function openMenuAction(name: string, action: string) {
  await userEvent.click(
    await screen.findByRole('button', { name: `Más acciones de ${name}` }),
  );
  await userEvent.click(await screen.findByRole('menuitem', { name: action }));
  return screen.findByRole('dialog');
}
