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
  dry_weight_kg: '313.2',
  evaluation: buildQualityEvaluation(),
});

const apiError = (status: number, code: string, extra = {}) =>
  HttpResponse.json(
    { detail: 'Error de prueba.', code, fields: {}, ...extra },
    { status },
  );

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
      id: `quality-classify-${crypto.randomUUID()}`,
      permissions: [PERMISSIONS.QUALITY_EVALUATE, PERMISSIONS.QUALITY_CLASSIFY],
    }),
  );
  return renderWithProviders(
    <QualityScreen lotHref={(id) => `/lotes/detalle?id=${id}`} />,
    { queryClient, searchParams: '?vista=evaluados' },
  );
}

const openClassification = async () => {
  await userEvent.click(
    await screen.findByRole('button', { name: `Clasificar el lote ${CODE}` }),
  );
  return screen.findByRole('dialog', { name: `Clasificar · ${CODE}` });
};

const fill = async (dialog: HTMLElement, label: string, value: string) => {
  const field = within(dialog).getByLabelText(label);
  await userEvent.clear(field);
  await userEvent.type(field, value);
};

const save = (dialog: HTMLElement) =>
  within(dialog).getByRole('button', { name: 'Guardar clasificación' });

describe('ClassificationDialog', () => {
  it('shows the evaluation as reference and starts the discard at zero', async () => {
    renderScreen();

    const dialog = await openClassification();
    expect(dialog).toHaveTextContent('313,2 kg secos · humedad final 7,0 %');
    expect(within(dialog).getByLabelText('Evaluación')).toHaveTextContent(
      'Bien fermentados85,0 %',
    );
    expect(within(dialog).getByLabelText('Descarte (kg)')).toHaveValue('0');
    expect(dialog).toHaveTextContent('Distribuido: 0,0 de 313,2 kg');
    expect(save(dialog)).toBeDisabled();
  });

  it('says what is missing or left over until it adds up', async () => {
    renderScreen();

    const dialog = await openClassification();
    await fill(dialog, 'G1 (kg)', '250');
    await fill(dialog, 'G2 (kg)', '50');
    expect(dialog).toHaveTextContent('Faltan 13,2 kg por distribuir');

    await fill(dialog, 'G2 (kg)', '68');
    expect(dialog).toHaveTextContent('Sobran 4,8 kg');
    expect(save(dialog)).toBeDisabled();

    await fill(dialog, 'G2 (kg)', '63,2');
    expect(dialog).toHaveTextContent('Distribuido: 313,2 de 313,2 kg');
    expect(save(dialog)).toBeEnabled();
  });

  it('classifies without a reason when nothing is discarded', async () => {
    const bodies: unknown[] = [];
    server.use(qualityWriteHandler('classification', evaluated, bodies));
    renderScreen();

    const dialog = await openClassification();
    expect(
      within(dialog).queryByLabelText('Motivo del descarte'),
    ).not.toBeInTheDocument();
    await fill(dialog, 'G1 (kg)', '300');
    await fill(dialog, 'G2 (kg)', '13,2');
    await userEvent.click(save(dialog));

    expect(await screen.findByText('Lote clasificado.')).toBeVisible();
    expect(bodies[0]).toEqual({
      expected_lot_version: 5,
      g1_kg: '300',
      g2_kg: '13.2',
      discard_kg: '0',
      discard_reason: '',
      discard_detail: '',
    });
    await waitFor(() => expect(queryDialog()).toBeNull());
  });

  it('asks for the reason of the discarded kilos, and the detail with Otro', async () => {
    const bodies: unknown[] = [];
    server.use(qualityWriteHandler('classification', evaluated, bodies));
    renderScreen();

    const dialog = await openClassification();
    await fill(dialog, 'G1 (kg)', '300');
    await fill(dialog, 'G2 (kg)', '7,2');
    await fill(dialog, 'Descarte (kg)', '6');
    await userEvent.click(save(dialog));
    expect(
      await within(dialog).findByText('Indique el motivo del descarte'),
    ).toBeVisible();

    await userEvent.selectOptions(
      within(dialog).getByLabelText('Motivo del descarte'),
      'other',
    );
    await userEvent.click(save(dialog));
    expect(
      await within(dialog).findByText('Describa el motivo del descarte'),
    ).toBeVisible();

    await userEvent.type(
      within(dialog).getByLabelText('Detalle'),
      'Granos germinados',
    );
    await userEvent.click(save(dialog));

    expect(await screen.findByText('Lote clasificado.')).toBeVisible();
    expect(bodies[0]).toMatchObject({
      discard_kg: '6',
      discard_reason: 'other',
      discard_detail: 'Granos germinados',
    });
  });

  it('shows the difference the server found', async () => {
    server.use(
      qualityWriteHandler(
        'classification',
        apiError(400, 'classification_sum_mismatch', {
          difference_kg: '2.0',
        }),
      ),
    );
    renderScreen();

    const dialog = await openClassification();
    await fill(dialog, 'G1 (kg)', '313,2');
    await fill(dialog, 'G2 (kg)', '0');
    await userEvent.click(save(dialog));

    expect(
      await within(dialog).findByText('Faltan 2,0 kg por distribuir'),
    ).toBeVisible();
  });

  it('closes and says why when the lot was discarded meanwhile', async () => {
    server.use(
      qualityWriteHandler(
        'classification',
        apiError(409, 'lot_invalid_status', { current_status: 'discarded' }),
      ),
    );
    renderScreen();

    const dialog = await openClassification();
    await fill(dialog, 'G1 (kg)', '313,2');
    await fill(dialog, 'G2 (kg)', '0');
    await userEvent.click(save(dialog));

    expect(
      await screen.findByText('El lote ya está descartado.'),
    ).toBeVisible();
    await waitFor(() => expect(queryDialog()).toBeNull());
  });
});
