import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import type { OnUrlUpdateFunction } from 'nuqs/adapters/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { queryKeys } from '@/lib/api/query-keys';
import type { LotStatus } from '@/lib/lot-status';
import { getOfflineDb } from '@/lib/offline/db';
import { PERMISSIONS } from '@/lib/permissions';
import {
  buildFarm,
  buildLotQuality,
  buildQualityClassification,
  buildQualityDiscard,
  buildQualityEvaluation,
  buildQualitySummary,
  buildSession,
} from '@/test/factories';
import {
  apiUrl,
  farmsHandler,
  qualityListHandler,
  qualitySummaryHandler,
} from '@/test/handlers';
import { createTestQueryClient, renderWithProviders } from '@/test/render';
import { resetLocation } from '@/test/router';
import { server } from '@/test/server';

vi.mock(
  'next/navigation',
  async () => (await import('@/test/router')).navigation,
);

import { qualityListCacheKey } from '../api';
import { QualityScreen } from './quality-screen';

const esperanza = { id: 'f1', code: 'F02', name: 'La Esperanza' };
const diviso = { id: 'f2', code: 'F03', name: 'El Diviso' };

const lotOf = (
  id: string,
  status: LotStatus,
  overrides: Parameters<typeof buildLotQuality>[0] = {},
) =>
  buildLotQuality({
    lot: {
      id,
      code: `000123-F02-P05-2610${id.slice(1)}-1`,
      status,
      version: 4,
    },
    ...overrides,
  });

const ALL = [
  PERMISSIONS.QUALITY_EVALUATE,
  PERMISSIONS.QUALITY_CLASSIFY,
  PERMISSIONS.QUALITY_DISCARD,
];

let userId: string;
let requests: URLSearchParams[];

beforeEach(() => {
  userId = `quality-screen-${crypto.randomUUID()}`;
  requests = [];
  resetLocation();
  server.use(
    farmsHandler([buildFarm({ ...esperanza }), buildFarm({ ...diviso })]),
    qualityListHandler([lotOf('l1', 'dried')], requests),
    qualitySummaryHandler(
      buildQualitySummary({
        to_evaluate: 3,
        to_evaluate_kg: '187.5',
        evaluated: 2,
        discarded_this_month: 1,
      }),
    ),
  );
});

function renderScreen({
  searchParams = '',
  superuser = false,
  permissions = ALL,
  onUrlUpdate,
  onAction,
}: {
  searchParams?: string;
  superuser?: boolean;
  permissions?: string[];
  onUrlUpdate?: OnUrlUpdateFunction;
  onAction?: Parameters<typeof QualityScreen>[0]['onAction'];
} = {}) {
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(
    queryKeys.session(),
    buildSession({ id: userId, is_superuser: superuser, permissions }),
  );
  return renderWithProviders(
    <QualityScreen
      lotHref={(id) => `/lotes/detalle?id=${id}`}
      onAction={onAction}
    />,
    { queryClient, searchParams, onUrlUpdate },
  );
}

const cards = async (name: string) =>
  Array.from(
    (await screen.findByRole('list', { name })).querySelectorAll<HTMLElement>(
      ':scope > li',
    ),
  );

describe('QualityScreen', () => {
  it('shows the figures of the day', async () => {
    renderScreen();

    const summary = await screen.findByRole('region', {
      name: 'Resumen de calidad',
    });
    await waitFor(() => expect(summary).toHaveTextContent('Por evaluar3'));
    expect(summary).toHaveTextContent('187,5 kg secos');
    expect(summary).toHaveTextContent('Por clasificar2');
    expect(summary).toHaveTextContent('Descartados este mes1');
  });

  it('lists the dry lots to evaluate with their weight, humidity and the end of the drying', async () => {
    const onAction = vi.fn();
    renderScreen({ onAction });

    const [card] = await cards('Lotes por evaluar');
    expect(requests[0].get('view')).toBe('to_evaluate');
    expect(card).toHaveTextContent('F02 · La Esperanza');
    expect(card).toHaveTextContent(
      '62,5 kg secos · 7,0 % de humedad · secado el 29 oct',
    );
    expect(
      within(card).getByRole('link', {
        name: 'Ver el lote 000123-F02-P05-26101-1',
      }),
    ).toHaveAttribute('href', expect.stringMatching(/id=l1/));

    await userEvent.click(
      within(card).getByRole('button', {
        name: 'Evaluar el lote 000123-F02-P05-26101-1',
      }),
    );
    expect(onAction).toHaveBeenCalledWith(
      expect.objectContaining({ lot: expect.objectContaining({ id: 'l1' }) }),
      'evaluar',
    );
  });

  it('shows the evaluation and offers to classify first, the rest in the menu', async () => {
    server.use(
      qualityListHandler([
        lotOf('l2', 'evaluated', { evaluation: buildQualityEvaluation() }),
      ]),
    );
    renderScreen({ searchParams: '?vista=evaluados' });

    const [card] = await cards('Lotes evaluados');
    expect(within(card).getByLabelText('Evaluación')).toHaveTextContent(
      'Bien fermentados85,0 %',
    );
    expect(card).toHaveTextContent('Con moho2,0 %');
    expect(card).toHaveTextContent('Evaluado por Cuenta de prueba el 30 oct');
    expect(
      within(card).getByRole('button', { name: /^Clasificar el lote/ }),
    ).toBeEnabled();

    await userEvent.click(
      within(card).getByRole('button', { name: /^Más acciones del lote/ }),
    );
    expect(
      await screen.findByRole('menuitem', { name: 'Corregir evaluación' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('menuitem', { name: 'Descartar lote' }),
    ).toBeInTheDocument();
  });

  it('only offers what the account may do', async () => {
    server.use(
      qualityListHandler([
        lotOf('l2', 'evaluated', { evaluation: buildQualityEvaluation() }),
      ]),
    );
    renderScreen({
      searchParams: '?vista=evaluados',
      permissions: [PERMISSIONS.QUALITY_EVALUATE],
    });

    const [card] = await cards('Lotes evaluados');
    expect(
      within(card).getByRole('button', { name: /^Corregir evaluación/ }),
    ).toBeInTheDocument();
    expect(
      within(card).queryByRole('button', { name: /^Clasificar/ }),
    ).not.toBeInTheDocument();
    expect(
      within(card).queryByRole('button', { name: /^Más acciones/ }),
    ).not.toBeInTheDocument();
  });

  it('shows the classification or the reason of a closed lot, with no actions', async () => {
    server.use(
      qualityListHandler([
        lotOf('l3', 'classified', {
          evaluation: buildQualityEvaluation(),
          classification: buildQualityClassification({
            g1_kg: '50.0',
            g2_kg: '6.5',
            discard_kg: '6.0',
            discard_reason: 'mold',
          }),
        }),
        lotOf('l4', 'discarded', {
          evaluation: buildQualityEvaluation(),
          discard: buildQualityDiscard({
            reason: 'other',
            detail: 'Granos germinados',
          }),
        }),
      ]),
    );
    renderScreen({ searchParams: '?vista=cerrados' });

    const [classified, discarded] = await cards('Lotes cerrados');
    expect(classified).toHaveTextContent('Clasificado');
    expect(classified).toHaveTextContent('G150,0 kg');
    expect(classified).toHaveTextContent('Descarte6,0 kg');
    expect(classified).toHaveTextContent('Motivo del descarte: Moho');
    expect(discarded).toHaveTextContent('Descartado');
    expect(discarded).toHaveTextContent('Motivo: Granos germinados');
    expect(within(discarded).queryAllByRole('button')).toHaveLength(0);
  });

  it('writes the tab in the URL and sends the filters', async () => {
    const onUrlUpdate = vi.fn<OnUrlUpdateFunction>();
    renderScreen({ searchParams: '?finca=f1&buscar=F02', onUrlUpdate });

    await cards('Lotes por evaluar');
    expect(requests[0].get('farm')).toBe('f1');
    expect(requests[0].get('search')).toBe('F02');

    await userEvent.click(screen.getByRole('button', { name: 'Cerrados' }));
    await waitFor(() =>
      expect(onUrlUpdate.mock.calls.at(-1)?.[0].queryString).toContain(
        'vista=cerrados',
      ),
    );
  });

  it('says each tab is empty with the quality illustration', async () => {
    server.use(qualityListHandler([]));
    renderScreen({ searchParams: '?vista=evaluados' });

    expect(
      await screen.findByRole('heading', {
        name: 'No hay lotes evaluados por clasificar.',
      }),
    ).toBeInTheDocument();
  });

  it('offers to clear the filters when nothing matches', async () => {
    server.use(qualityListHandler([]));
    renderScreen({ searchParams: '?buscar=zzz' });

    expect(
      await screen.findByRole('heading', {
        name: 'Ningún lote coincide con los filtros.',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole('button', { name: 'Limpiar filtros' }).length,
    ).toBeGreaterThan(0);
  });

  it('shows the copy without a connection, with the actions disabled', async () => {
    await getOfflineDb(userId).cache.put({
      key: qualityListCacheKey('to_evaluate', {
        producer: null,
        farm: null,
        search: '',
      }),
      value: { count: 1, results: [lotOf('l1', 'dried')] },
      fetchedAt: 1_760_000_000_000,
    });
    server.use(http.get(apiUrl('/api/quality'), () => HttpResponse.error()));
    renderScreen();

    expect(
      await screen.findByText(/Sin conexión: estás viendo la copia del/),
    ).toHaveTextContent('Registrar la calidad necesita conexión.');
    const [card] = await cards('Lotes por evaluar');
    expect(
      within(card).getByRole('button', { name: /^Evaluar el lote/ }),
    ).toBeDisabled();
  });

  it('asks for a connection once when there is no copy', async () => {
    server.use(http.get(apiUrl('/api/quality'), () => HttpResponse.error()));
    renderScreen();

    expect(
      await screen.findByRole('heading', {
        name: 'Necesitas conexión una vez para cargar los lotes de calidad.',
      }),
    ).toBeInTheDocument();
  });

  it('asks the technical account to choose a producer first', async () => {
    renderScreen({ superuser: true });

    expect(
      await screen.findByText(
        'Elige un productor para ver sus lotes de calidad.',
      ),
    ).toBeInTheDocument();
  });
});
