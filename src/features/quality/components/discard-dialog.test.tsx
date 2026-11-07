import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { queryKeys } from '@/lib/api/query-keys';
import { PERMISSIONS } from '@/lib/permissions';
import {
  buildFarm,
  buildLotQuality,
  buildQualityEvaluation,
  buildSession,
} from '@/test/factories';
import {
  farmsHandler,
  qualityListHandler,
  qualitySummaryHandler,
  qualityWriteHandler,
} from '@/test/handlers';
import { queryDialog } from '@/test/dialog';
import { createTestQueryClient, renderWithProviders } from '@/test/render';
import { resetLocation } from '@/test/router';
import { server } from '@/test/server';

vi.mock(
  'next/navigation',
  async () => (await import('@/test/router')).navigation,
);

import { QualityScreen } from './quality-screen';

const CODE = '000123-F02-P05-261014-1';

const evaluated = buildLotQuality({
  lot: { id: 'l1', code: CODE, status: 'evaluated', version: 5 },
  evaluation: buildQualityEvaluation(),
});

beforeEach(() => {
  resetLocation();
  server.use(
    farmsHandler([buildFarm()]),
    qualityListHandler([evaluated]),
    qualitySummaryHandler(),
  );
});

function renderScreen() {
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(
    queryKeys.session(),
    buildSession({
      id: `quality-discard-${crypto.randomUUID()}`,
      permissions: [PERMISSIONS.QUALITY_EVALUATE, PERMISSIONS.QUALITY_DISCARD],
    }),
  );
  return renderWithProviders(
    <QualityScreen lotHref={(id) => `/lotes/detalle?id=${id}`} />,
    { queryClient, searchParams: '?vista=evaluados' },
  );
}

const openDiscard = async () => {
  await userEvent.click(
    await screen.findByRole('button', {
      name: `Más acciones del lote ${CODE}`,
    }),
  );
  await userEvent.click(
    await screen.findByRole('menuitem', { name: 'Descartar lote' }),
  );
  return screen.findByRole('dialog', { name: `Descartar lote · ${CODE}` });
};

const confirmation = () =>
  screen.findByRole('dialog', { name: `¿Descartar el lote ${CODE}?` });

describe('DiscardDialog', () => {
  it('asks for the reason before confirming', async () => {
    renderScreen();

    const dialog = await openDiscard();
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Descartar' }),
    );

    expect(
      await within(dialog).findByText('Indique el motivo del descarte'),
    ).toBeVisible();
    expect(
      screen.queryByRole('dialog', { name: /Descartar el lote/ }),
    ).toBeNull();
  });

  it('confirms and discards the whole lot', async () => {
    const bodies: unknown[] = [];
    server.use(qualityWriteHandler('discard', evaluated, bodies));
    renderScreen();

    const dialog = await openDiscard();
    await userEvent.selectOptions(
      within(dialog).getByLabelText('Motivo del descarte'),
      'mold',
    );
    await userEvent.type(
      within(dialog).getByLabelText('Detalle (opcional)'),
      'Moho en casi todo el corte',
    );
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Descartar' }),
    );
    const confirm = await confirmation();
    expect(confirm).toHaveTextContent(
      'Esta acción no se puede deshacer. El lote no podrá clasificarse, ingresar a bodega ni venderse.',
    );
    await userEvent.click(
      within(confirm).getByRole('button', { name: 'Descartar lote' }),
    );

    expect(await screen.findByText('Lote descartado.')).toBeVisible();
    expect(bodies[0]).toEqual({
      expected_lot_version: 5,
      reason: 'mold',
      detail: 'Moho en casi todo el corte',
    });
    await waitFor(() => expect(queryDialog()).toBeNull());
  });

  it('changes nothing when the confirmation is cancelled', async () => {
    const bodies: unknown[] = [];
    server.use(qualityWriteHandler('discard', evaluated, bodies));
    renderScreen();

    const dialog = await openDiscard();
    await userEvent.selectOptions(
      within(dialog).getByLabelText('Motivo del descarte'),
      'mold',
    );
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Descartar' }),
    );
    await userEvent.click(
      within(await confirmation()).getByRole('button', { name: 'Cancelar' }),
    );

    await waitFor(() =>
      expect(
        screen.queryByRole('dialog', { name: /Descartar el lote/ }),
      ).toBeNull(),
    );
    expect(bodies).toHaveLength(0);
    expect(
      screen.getByRole('dialog', { name: `Descartar lote · ${CODE}` }),
    ).toBeVisible();
  });

  it('asks for the detail with Otro', async () => {
    renderScreen();

    const dialog = await openDiscard();
    await userEvent.selectOptions(
      within(dialog).getByLabelText('Motivo del descarte'),
      'other',
    );
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Descartar' }),
    );

    expect(
      await within(dialog).findByText('Describa el motivo del descarte'),
    ).toBeVisible();
  });

  it('closes and says why when the lot was classified meanwhile', async () => {
    server.use(
      qualityWriteHandler(
        'discard',
        HttpResponse.json(
          {
            detail: 'Error de prueba.',
            code: 'lot_invalid_status',
            fields: {},
            current_status: 'classified',
          },
          { status: 409 },
        ),
      ),
    );
    renderScreen();

    const dialog = await openDiscard();
    await userEvent.selectOptions(
      within(dialog).getByLabelText('Motivo del descarte'),
      'mold',
    );
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Descartar' }),
    );
    await userEvent.click(
      within(await confirmation()).getByRole('button', {
        name: 'Descartar lote',
      }),
    );

    expect(
      await screen.findByText('El lote ya está clasificado.'),
    ).toBeVisible();
    await waitFor(() => expect(queryDialog()).toBeNull());
  });
});
