import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  readActingProducer,
  syncActingProducer,
  writeActingProducer,
} from '@/lib/acting-producer';
import {
  apiError,
  buildPage,
  buildProducer,
  buildSession,
} from '@/test/factories';
import { apiUrl } from '@/test/handlers';
import { renderWithProviders } from '@/test/render';
import { server } from '@/test/server';

import { ActingProducerSelect } from './acting-producer-select';

let pathname = '/usuarios';
vi.mock('next/navigation', () => ({ usePathname: () => pathname }));

let connected = true;
vi.mock('@/hooks/use-has-connection', () => ({
  useHasConnection: () => connected,
}));

const PRODUCER = '33333333-3333-4333-8333-333333333333';
const OTHER = '44444444-4444-4444-8444-444444444444';
const USER = 'su1';

const listItem = (id: string, first_name: string, member_code: string) => ({
  id,
  member_code,
  document_type: 'CC',
  identity_document: '1234567890',
  first_name,
  last_name: 'Prueba',
  municipality_code: '54001',
  status: 'active',
});

function signIn(is_superuser: boolean) {
  server.use(
    http.get(apiUrl('/api/auth/me'), () =>
      HttpResponse.json(buildSession({ id: USER, is_superuser })),
    ),
    http.get(apiUrl('/api/producers'), () =>
      HttpResponse.json(
        buildPage([
          listItem(PRODUCER, 'Ana', 'PROD-000007'),
          listItem(OTHER, 'Luis', 'PROD-000008'),
        ]),
      ),
    ),
    http.get(apiUrl(`/api/producers/${PRODUCER}`), () =>
      HttpResponse.json(
        buildProducer({
          id: PRODUCER,
          first_name: 'Ana',
          last_name: 'Prueba',
          member_code: 'PROD-000007',
        }),
      ),
    ),
  );
}

beforeEach(() => {
  pathname = '/usuarios';
  connected = true;
  sessionStorage.clear();
  syncActingProducer(null);
});

afterEach(() => {
  sessionStorage.clear();
  syncActingProducer(null);
});

const field = () => screen.findByRole('combobox', { name: 'Productor activo' });

describe('ActingProducerSelect', () => {
  it('is not offered to an account that is not a superuser', async () => {
    signIn(false);
    renderWithProviders(<ActingProducerSelect />);

    await waitFor(() =>
      expect(screen.queryByRole('combobox')).not.toBeInTheDocument(),
    );
  });

  it('is not offered in a section that is for the whole association', async () => {
    signIn(true);
    pathname = '/productores';
    renderWithProviders(<ActingProducerSelect />);

    await waitFor(() =>
      expect(screen.queryByRole('combobox')).not.toBeInTheDocument(),
    );
  });

  it.each(['/usuarios', '/roles'])(
    'is offered to a superuser in %s',
    async (path) => {
      signIn(true);
      pathname = path;
      renderWithProviders(<ActingProducerSelect />);

      expect(await field()).toHaveAttribute('placeholder', 'Elegir productor');
    },
  );

  it('is not offered in Fincas: each farm already says its producer', async () => {
    signIn(true);
    pathname = '/fincas';
    renderWithProviders(<ActingProducerSelect />);

    await waitFor(() =>
      expect(screen.queryByRole('combobox')).not.toBeInTheDocument(),
    );
  });

  it('opens its list right under the field, not in a window of its own', async () => {
    signIn(true);
    renderWithProviders(<ActingProducerSelect />);

    await userEvent.click(await field());

    expect(
      await screen.findByRole('option', { name: 'Ana Prueba · PROD-000007' }),
    ).toBeVisible();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows the name and code of the chosen producer', async () => {
    signIn(true);
    writeActingProducer(USER, PRODUCER);
    renderWithProviders(<ActingProducerSelect />);

    await waitFor(async () =>
      expect(await field()).toHaveValue('Ana Prueba · PROD-000007'),
    );
  });

  it('chooses a producer from the list', async () => {
    signIn(true);
    renderWithProviders(<ActingProducerSelect />);

    await userEvent.click(await field());
    await userEvent.click(
      await screen.findByRole('option', { name: 'Ana Prueba · PROD-000007' }),
    );

    await waitFor(() => expect(readActingProducer(USER)).toBe(PRODUCER));
  });

  it('removes the chosen producer', async () => {
    signIn(true);
    writeActingProducer(USER, PRODUCER);
    renderWithProviders(<ActingProducerSelect />);

    await userEvent.click(
      await screen.findByRole('button', { name: 'Borrar' }),
    );

    await waitFor(() => expect(readActingProducer(USER)).toBeNull());
  });

  it('forgets a producer that no longer exists and says so', async () => {
    signIn(true);
    writeActingProducer(USER, PRODUCER);
    server.use(
      http.get(apiUrl(`/api/producers/${PRODUCER}`), () =>
        apiError(404, 'not_found'),
      ),
    );
    renderWithProviders(<ActingProducerSelect />);

    await waitFor(() => expect(readActingProducer(USER)).toBeNull());
    expect(await screen.findByRole('status')).toHaveTextContent(
      'El productor que habías elegido ya no existe.',
    );
  });

  it('keeps showing the chosen producer without a connection but cannot change it', async () => {
    signIn(true);
    writeActingProducer(USER, PRODUCER);
    connected = false;
    renderWithProviders(<ActingProducerSelect />);

    expect(await screen.findByText(/Productor: Ana Prueba/)).toBeVisible();
    expect(
      screen.getByText(/Necesitas conexión para cambiar/),
    ).toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });
});
