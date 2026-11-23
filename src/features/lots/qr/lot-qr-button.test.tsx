import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { queryKeys } from '@/lib/api/query-keys';
import { PERMISSIONS } from '@/lib/permissions';
import { notify } from '@/lib/notify';
import { apiError, buildLot, buildLotQr, buildSession } from '@/test/factories';
import { apiUrl } from '@/test/handlers';
import { createTestQueryClient, renderWithProviders } from '@/test/render';
import { resetLocation } from '@/test/router';
import { server } from '@/test/server';

vi.mock(
  'next/navigation',
  async () => (await import('@/test/router')).navigation,
);

import { LotDetailScreen } from '../components/lot-detail-screen';

const CAN_GENERATE = [PERMISSIONS.LOTS_VIEW, PERMISSIONS.LOTS_GENERATE_QR];
const CAN_ONLY_READ = [PERMISSIONS.LOTS_VIEW];

function serve(lot: ReturnType<typeof buildLot>) {
  server.use(
    http.get(apiUrl(`/api/lots/${lot.id}`), () => HttpResponse.json(lot)),
  );
}

function renderScreen(permissions: string[]) {
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(
    queryKeys.session(),
    buildSession({ id: `qr-${crypto.randomUUID()}`, permissions }),
  );
  renderWithProviders(<LotDetailScreen lotId="l1" />, { queryClient });
}

const qrButton = () => screen.queryByRole('button', { name: 'Código QR' });

beforeEach(() => {
  resetLocation();
  vi.spyOn(notify, 'success').mockImplementation(() => undefined as never);
  vi.spyOn(notify, 'info').mockImplementation(() => undefined as never);
});

describe('the Código QR button of the lot page', () => {
  it.each(['classified', 'in_warehouse'] as const)(
    'is offered for a %s lot without a code to who may generate it',
    async (status) => {
      serve(buildLot({ status }));
      renderScreen(CAN_GENERATE);
      expect(
        await screen.findByRole('button', { name: 'Código QR' }),
      ).toBeInTheDocument();
    },
  );

  it.each([
    'generated',
    'fermenting',
    'dried',
    'evaluated',
    'discarded',
  ] as const)('is not offered for a %s lot', async (status) => {
    serve(buildLot({ status }));
    renderScreen(CAN_GENERATE);
    await screen.findByRole('heading', { level: 1 });
    expect(qrButton()).not.toBeInTheDocument();
  });

  it('is not offered to who may not generate when there is no code yet', async () => {
    serve(buildLot({ status: 'classified' }));
    renderScreen(CAN_ONLY_READ);
    await screen.findByRole('heading', { level: 1 });
    expect(qrButton()).not.toBeInTheDocument();
  });

  it('shows and lets download an existing code to who may only read the lot', async () => {
    serve(buildLot({ status: 'in_warehouse', qr: buildLotQr() }));
    renderScreen(CAN_ONLY_READ);

    await userEvent.click(
      await screen.findByRole('button', { name: 'Código QR' }),
    );

    expect(
      await screen.findByRole('button', { name: 'Descargar PNG' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Generar código QR' }),
    ).not.toBeInTheDocument();
  });

  it('switches to the code that someone else generated first when the server answers 409', async () => {
    serve(buildLot({ status: 'classified' }));
    server.use(
      http.get(apiUrl('/api/auth/csrf'), () =>
        HttpResponse.json({ csrf_token: 'token' }),
      ),
      http.post(apiUrl('/api/lots/l1/qr'), () => {
        // Cuando el servidor rechaza, ya existe el de la otra persona.
        serve(buildLot({ status: 'classified', qr: buildLotQr() }));
        return apiError(
          409,
          'lot_qr_already_exists',
          'Este lote ya tiene un código QR.',
        );
      }),
    );
    renderScreen(CAN_GENERATE);

    await userEvent.click(
      await screen.findByRole('button', { name: 'Código QR' }),
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Generar código QR' }),
    );

    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Descargar PNG' }),
      ).toBeInTheDocument(),
    );
    expect(
      screen.queryByRole('button', { name: 'Generar código QR' }),
    ).not.toBeInTheDocument();
  });
});
