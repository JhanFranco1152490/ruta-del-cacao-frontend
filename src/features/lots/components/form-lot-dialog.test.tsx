import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { queryKeys } from '@/lib/api/query-keys';
import { PERMISSIONS } from '@/lib/permissions';
import { apiError, buildLot, buildSession } from '@/test/factories';
import { apiUrl } from '@/test/handlers';
import { createTestQueryClient, renderWithProviders } from '@/test/render';
import { mockLocation, resetLocation, router } from '@/test/router';
import { server } from '@/test/server';

vi.mock(
  'next/navigation',
  async () => (await import('@/test/router')).navigation,
);

import type { LotSource } from '../lot-source';
import { FormLotDialog } from './form-lot-dialog';

const SOURCE: LotSource = {
  harvestId: 'h1',
  plot: 'P05 · Lote del río',
  farm: 'F02 · La Esperanza',
  harvestDate: '2026-10-14',
  greenWeightKg: '120.5',
  variety: 'CCN-51',
};

let bodies: { id: string; harvest_id: string }[];

beforeEach(() => {
  bodies = [];
  vi.clearAllMocks();
  resetLocation();
});

afterEach(() => {
  vi.restoreAllMocks();
});

const answerWith = (...responses: (() => Response)[]) =>
  server.use(
    http.post(apiUrl('/api/lots'), async ({ request }) => {
      bodies.push((await request.json()) as (typeof bodies)[number]);
      return responses[Math.min(bodies.length, responses.length) - 1]();
    }),
  );

function renderDialog({
  permissions = [PERMISSIONS.HARVESTS_VIEW, PERMISSIONS.LOTS_ADD],
  inRow = false,
}: { permissions?: string[]; inRow?: boolean } = {}) {
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(
    queryKeys.session(),
    buildSession({ id: 'u1', permissions }),
  );
  renderWithProviders(<FormLotDialog inRow={inRow} source={SOURCE} />, {
    queryClient,
  });
}

const openAndConfirm = async () => {
  await userEvent.click(screen.getByRole('button', { name: 'Conformar lote' }));
  const dialog = await screen.findByRole('dialog');
  await userEvent.click(
    within(dialog).getByRole('button', { name: 'Conformar' }),
  );
  return dialog;
};

describe('FormLotDialog', () => {
  it('summarizes the harvest before forming the lot, with a way back', async () => {
    renderDialog();

    await userEvent.click(
      screen.getByRole('button', { name: 'Conformar lote' }),
    );
    const dialog = await screen.findByRole('dialog');

    expect(dialog).toHaveTextContent(
      'Vas a conformar un lote con la cosecha de P05 · Lote del río (F02 · La Esperanza) del 14 de octubre de 2026: 120,5 kg en verde de CCN-51. El código se asigna ahora y no se puede cambiar.',
    );
    expect(
      within(dialog).getByRole('button', { name: 'Volver' }),
    ).toBeInTheDocument();
  });

  it('forms the lot and opens it with a notice', async () => {
    answerWith(() =>
      HttpResponse.json(buildLot({ id: 'l9' }), { status: 201 }),
    );
    mockLocation.path = '/cosechas/detalle';
    mockLocation.search = 'id=h1';
    renderDialog();

    await openAndConfirm();

    await waitFor(() =>
      expect(router.push).toHaveBeenCalledWith(
        '/lotes/detalle?id=l9&origen=%2Fcosechas%2Fdetalle%3Fid%3Dh1',
      ),
    );
    expect(await screen.findByText('Lote conformado')).toBeInTheDocument();
    expect(bodies).toEqual([{ id: expect.any(String), harvest_id: 'h1' }]);
  });

  it('goes back to the list it was told when the current screen is a passing one', async () => {
    answerWith(() =>
      HttpResponse.json(buildLot({ id: 'l9' }), { status: 201 }),
    );
    mockLocation.path = '/cosechas/registrar';
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(
      queryKeys.session(),
      buildSession({ id: 'u1', permissions: [PERMISSIONS.LOTS_ADD] }),
    );
    renderWithProviders(
      <FormLotDialog returnTo="/cosechas?mes=2026-10" source={SOURCE} />,
      { queryClient },
    );

    await openAndConfirm();

    await waitFor(() =>
      expect(router.push).toHaveBeenCalledWith(
        '/lotes/detalle?id=l9&origen=%2Fcosechas%3Fmes%3D2026-10',
      ),
    );
  });

  it('retries with the same id after a failure', async () => {
    answerWith(
      () => apiError(500, 'server_error'),
      () => HttpResponse.json(buildLot(), { status: 200 }),
    );
    renderDialog();

    const dialog = await openAndConfirm();
    expect(
      await within(dialog).findByText('Error de prueba.'),
    ).toBeInTheDocument();
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Conformar' }),
    );

    await waitFor(() =>
      expect(router.push).toHaveBeenCalledWith(
        expect.stringMatching(/^\/lotes\/detalle\?id=l1&/),
      ),
    );
    expect(bodies[1].id).toBe(bodies[0].id);
  });

  it('opens the existing lot when someone else formed it first', async () => {
    answerWith(() =>
      HttpResponse.json(
        {
          detail: 'Ya forma un lote.',
          code: 'harvest_already_in_lot',
          fields: {},
          current: buildLot({ id: 'l7', code: '000123-F02-P05-261014-2' }),
        },
        { status: 409 },
      ),
    );
    renderDialog();

    await openAndConfirm();

    await waitFor(() =>
      expect(router.push).toHaveBeenCalledWith(
        expect.stringMatching(/^\/lotes\/detalle\?id=l7&/),
      ),
    );
    expect(
      await screen.findByText(
        'Esta cosecha ya forma el lote 000123-F02-P05-261014-2',
      ),
    ).toBeInTheDocument();
  });

  it('says when the harvest no longer exists', async () => {
    answerWith(() => apiError(404, 'not_found'));
    renderDialog();

    const dialog = await openAndConfirm();

    expect(
      await within(dialog).findByText('Esta cosecha ya no existe.'),
    ).toBeInTheDocument();
    expect(router.push).not.toHaveBeenCalled();
  });

  it('is disabled without a connection', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    renderDialog();
    expect(
      screen.getByRole('button', { name: /Conformar lote/ }),
    ).toBeDisabled();
  });

  it('is left out of a row without a connection', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    renderDialog({ inRow: true });
    expect(screen.queryByRole('button', { name: /Conformar lote/ })).toBeNull();
  });

  it('does not appear without permission to form lots', () => {
    renderDialog({ permissions: [PERMISSIONS.HARVESTS_VIEW] });
    expect(screen.queryByRole('button', { name: /Conformar lote/ })).toBeNull();
  });
});
