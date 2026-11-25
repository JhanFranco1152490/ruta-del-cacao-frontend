import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { queryKeys } from '@/lib/api/query-keys';
import { PERIOD_ERROR_MESSAGE } from '@/lib/period';
import { PERMISSIONS } from '@/lib/permissions';
import {
  apiError,
  buildAuditEntries,
  buildPage,
  buildProducer,
  buildSession,
} from '@/test/factories';
import { apiUrl, auditLogHandler, auditOptionsHandler } from '@/test/handlers';
import { createTestQueryClient, renderWithProviders } from '@/test/render';
import { mockLocation, resetLocation } from '@/test/router';
import { server } from '@/test/server';

vi.mock(
  'next/navigation',
  async () => (await import('@/test/router')).navigation,
);

import { AuditLogScreen } from './audit-log-screen';

let logRequests: URLSearchParams[];
let optionRequests: URLSearchParams[];

beforeEach(() => {
  logRequests = [];
  optionRequests = [];
  resetLocation();
  mockLocation.path = '/bitacora';
  server.use(
    auditLogHandler(undefined, logRequests),
    auditOptionsHandler(undefined, optionRequests),
  );
});

function renderScreen({
  searchParams = '',
  superuser = false,
}: { searchParams?: string; superuser?: boolean } = {}) {
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(
    queryKeys.session(),
    buildSession({
      permissions: [PERMISSIONS.AUDIT_VIEW],
      is_superuser: superuser,
    }),
  );
  return renderWithProviders(<AuditLogScreen />, {
    queryClient,
    searchParams,
  });
}

const query = (params: URLSearchParams) => Object.fromEntries(params);

const recordTypeField = () =>
  screen.getByRole('combobox', { name: 'Tipo de registro' });

describe('AuditLogScreen', () => {
  it('opens on the whole log, newest first, with the filters of the producer', async () => {
    renderScreen();

    expect(
      screen.getByRole('heading', { name: 'Bitácora de cambios' }),
    ).toBeInTheDocument();
    expect(await screen.findByText('7 cambios')).toBeInTheDocument();
    expect(query(logRequests[0])).toEqual({ page: '1', page_size: '20' });
    expect(query(optionRequests[0])).toEqual({});
    await waitFor(() =>
      expect(
        screen.getByRole('option', { name: 'Cosecha' }),
      ).toBeInTheDocument(),
    );
  });

  it('shows the entries in a table with their changes', async () => {
    renderScreen();

    const table = await screen.findByRole('table', {
      name: 'Bitácora de cambios',
    });
    expect(table).toHaveTextContent('Cosecha corregida');
    expect(table).toHaveTextContent('Teléfono: modificado');
    // Con 7 cambios cabe en una página: no hay paginación.
    expect(
      screen.queryByRole('navigation', { name: 'Paginación de cambios' }),
    ).toBeNull();
  });

  it('pages through a long log', async () => {
    const user = userEvent.setup();
    server.use(
      auditLogHandler(buildPage(buildAuditEntries(), 45), logRequests),
    );
    renderScreen();

    const pages = await screen.findByRole('navigation', {
      name: 'Paginación de cambios',
    });
    expect(pages).toHaveTextContent('Página 1 de 3');
    await user.click(within(pages).getByRole('button', { name: 'Siguiente' }));

    await waitFor(() => expect(logRequests.at(-1)?.get('page')).toBe('2'));
  });

  it('asks the log with the filters of a shared link', async () => {
    renderScreen({
      searchParams:
        '?usuario=acc-2&tipo=harvest&desde=2026-11-01&hasta=2026-11-20&pagina=2',
    });

    await screen.findByText('7 cambios');
    expect(query(logRequests[0])).toEqual({
      actor: 'acc-2',
      record_type: 'harvest',
      from: '2026-11-01',
      to: '2026-11-20',
      page: '2',
      page_size: '20',
    });
    expect(recordTypeField()).toHaveValue('harvest');
  });

  it('filters by record type and clears the filters', async () => {
    const user = userEvent.setup();
    renderScreen();
    await screen.findByRole('option', { name: 'Cosecha' });

    await user.selectOptions(recordTypeField(), 'Cosecha');
    await waitFor(() =>
      expect(logRequests.at(-1)?.get('record_type')).toBe('harvest'),
    );

    await user.click(screen.getByRole('button', { name: 'Limpiar filtros' }));
    await waitFor(() =>
      expect(logRequests.at(-1)?.has('record_type')).toBe(false),
    );
    expect(recordTypeField()).toHaveValue('');
  });

  it('does not ask with the end date before the start date', async () => {
    renderScreen({ searchParams: '?desde=2026-11-20&hasta=2026-11-01' });

    expect(
      await screen.findByRole('heading', { name: 'Revisa el periodo.' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Desde')).toHaveAccessibleDescription(
      PERIOD_ERROR_MESSAGE,
    );
    expect(logRequests).toEqual([]);
  });

  it('says the log is empty when nothing was recorded yet', async () => {
    server.use(auditLogHandler(buildPage([])));
    renderScreen();

    expect(
      await screen.findByRole('heading', {
        name: 'Aún no hay cambios registrados.',
      }),
    ).toBeInTheDocument();
  });

  it('says the filters found nothing and offers to clear them', async () => {
    const user = userEvent.setup();
    server.use(auditLogHandler(buildPage([]), logRequests));
    renderScreen({ searchParams: '?tipo=sale' });

    expect(
      await screen.findByRole('heading', {
        name: 'No hay registros para este filtro.',
      }),
    ).toBeInTheDocument();

    const clearButtons = screen.getAllByRole('button', {
      name: 'Limpiar filtros',
    });
    await user.click(clearButtons.at(-1)!);
    await waitFor(() =>
      expect(logRequests.at(-1)?.has('record_type')).toBe(false),
    );
  });

  it('says a user of a saved link is not of the producer', async () => {
    server.use(
      auditLogHandler(
        apiError(404, 'not_found', 'No encontrado.', {
          actor: ['La cuenta no es de este productor.'],
        }),
      ),
    );
    renderScreen({ searchParams: '?usuario=otra' });

    expect(
      await screen.findByText('La cuenta no es de este productor.'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', {
        name: 'No hay registros para este filtro.',
      }),
    ).toBeInTheDocument();
  });

  it('shows the error of the server with a way to try again', async () => {
    server.use(
      auditLogHandler(
        apiError(
          403,
          'permission_denied',
          'No tienes permiso para realizar esta acción.',
        ),
      ),
    );
    renderScreen();

    expect(
      await screen.findByText('No tienes permiso para realizar esta acción.'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Reintentar' }),
    ).toBeInTheDocument();
  });
});

describe('AuditLogScreen for the technical account', () => {
  it('asks for a producer before asking anything', async () => {
    renderScreen({ superuser: true });

    expect(
      await screen.findByText('Elige un productor para ver su bitácora.'),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('combobox', { name: 'Tipo de registro' }),
    ).toBeNull();
    expect(logRequests).toEqual([]);
    expect(optionRequests).toEqual([]);
  });

  it('asks the log and its options of the chosen producer', async () => {
    server.use(
      http.get(apiUrl('/api/producers/pr-1'), () =>
        HttpResponse.json(buildProducer({ id: 'pr-1' })),
      ),
    );
    renderScreen({ superuser: true, searchParams: '?productor=pr-1' });

    await screen.findByText('7 cambios');
    expect(logRequests[0].get('producer')).toBe('pr-1');
    expect(optionRequests[0].get('producer')).toBe('pr-1');
  });
});
