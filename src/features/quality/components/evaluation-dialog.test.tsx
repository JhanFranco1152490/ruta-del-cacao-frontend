import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { queryKeys } from '@/lib/api/query-keys';
import type { LotStatus } from '@/lib/lot-status';
import { PERMISSIONS } from '@/lib/permissions';
import {
  buildFarm,
  buildLotQuality,
  buildQualityEvaluation,
  buildSession,
} from '@/test/factories';
import {
  farmsHandler,
  qualityDetailHandler,
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

const lotIn = (status: LotStatus, overrides = {}) =>
  buildLotQuality({
    lot: { id: 'l1', code: CODE, status, version: 4 },
    ...overrides,
  });

// Un 409 con lo que el servidor agrega al error: el estado del lote o la evaluación vigente.
const conflict = (code: string, extra: Record<string, unknown>) =>
  HttpResponse.json(
    { detail: 'Error de prueba.', code, fields: {}, ...extra },
    { status: 409 },
  );

const evaluated = () =>
  lotIn('evaluated', {
    evaluation: buildQualityEvaluation({ version: 2, notes: 'Buen corte' }),
  });

beforeEach(() => {
  resetLocation();
  server.use(
    farmsHandler([buildFarm()]),
    qualityListHandler([lotIn('dried')]),
    qualitySummaryHandler(),
  );
});

function renderScreen(searchParams = '') {
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(
    queryKeys.session(),
    buildSession({
      id: `quality-eval-${crypto.randomUUID()}`,
      permissions: [
        PERMISSIONS.QUALITY_EVALUATE,
        PERMISSIONS.QUALITY_CLASSIFY,
        PERMISSIONS.QUALITY_DISCARD,
      ],
    }),
  );
  return renderWithProviders(
    <QualityScreen lotHref={(id) => `/lotes/detalle?id=${id}`} />,
    { queryClient, searchParams },
  );
}

const openEvaluation = async () => {
  await userEvent.click(
    await screen.findByRole('button', { name: `Evaluar el lote ${CODE}` }),
  );
  return screen.findByRole('dialog', { name: `Evaluar · ${CODE}` });
};

const fill = async (dialog: HTMLElement, label: string, value: string) => {
  const field = within(dialog).getByLabelText(label);
  await userEvent.clear(field);
  if (value) await userEvent.type(field, value);
};

describe('EvaluationDialog', () => {
  it('records the evaluation with the lot version and says so', async () => {
    const bodies: unknown[] = [];
    server.use(qualityWriteHandler('evaluation', evaluated(), bodies));
    renderScreen();

    const dialog = await openEvaluation();
    await fill(dialog, 'Bien fermentados (%)', '85');
    await fill(dialog, 'Con moho (%)', '2,5');
    await fill(dialog, 'Otros defectos (%)', '5');
    expect(dialog).toHaveTextContent(
      'Suma: 92,5 % · 7,5 % en otras categorías',
    );
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Guardar evaluación' }),
    );

    expect(await screen.findByText('Evaluación registrada.')).toBeVisible();
    expect(bodies[0]).toEqual({
      expected_lot_version: 4,
      well_fermented_pct: '85',
      moldy_pct: '2.5',
      other_defects_pct: '5',
      notes: '',
    });
    await waitFor(() => expect(queryDialog()).toBeNull());
  });

  it('does not let save a sum over 100', async () => {
    renderScreen();

    const dialog = await openEvaluation();
    await fill(dialog, 'Bien fermentados (%)', '90');
    await fill(dialog, 'Con moho (%)', '8');
    await fill(dialog, 'Otros defectos (%)', '3');

    expect(dialog).toHaveTextContent('La suma no puede pasar de 100 %');
    expect(
      within(dialog).getByRole('button', { name: 'Guardar evaluación' }),
    ).toBeDisabled();
  });

  it('asks for the three percentages', async () => {
    renderScreen();

    const dialog = await openEvaluation();
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Guardar evaluación' }),
    );

    expect(
      await within(dialog).findAllByText('Campo obligatorio'),
    ).toHaveLength(3);
  });

  it('says the lot was evaluated meanwhile and refreshes the list', async () => {
    server.use(
      qualityWriteHandler(
        'evaluation',
        conflict('lot_invalid_status', { current_status: 'evaluated' }),
      ),
    );
    renderScreen();

    const dialog = await openEvaluation();
    await fill(dialog, 'Bien fermentados (%)', '85');
    await fill(dialog, 'Con moho (%)', '2');
    await fill(dialog, 'Otros defectos (%)', '5');
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Guardar evaluación' }),
    );

    expect(await screen.findByText('El lote ya está evaluado.')).toBeVisible();
    await waitFor(() => expect(queryDialog()).toBeNull());
  });

  describe('correcting', () => {
    beforeEach(() => {
      server.use(qualityListHandler([evaluated()]));
    });

    const openCorrection = async () => {
      await userEvent.click(
        await screen.findByRole('button', {
          name: `Más acciones del lote ${CODE}`,
        }),
      );
      await userEvent.click(
        await screen.findByRole('menuitem', { name: 'Corregir evaluación' }),
      );
      return screen.findByRole('dialog', {
        name: `Corregir evaluación · ${CODE}`,
      });
    };

    it('opens with the current values and sends the evaluation version', async () => {
      const bodies: unknown[] = [];
      server.use(
        qualityWriteHandler('evaluation-correction', evaluated(), bodies),
      );
      renderScreen('?vista=evaluados');

      const dialog = await openCorrection();
      expect(within(dialog).getByLabelText('Bien fermentados (%)')).toHaveValue(
        '85.0',
      );
      expect(within(dialog).getByLabelText(/Observaciones/)).toHaveValue(
        'Buen corte',
      );
      await fill(dialog, 'Con moho (%)', '3');
      await userEvent.click(
        within(dialog).getByRole('button', { name: 'Guardar evaluación' }),
      );

      expect(await screen.findByText('Evaluación actualizada.')).toBeVisible();
      expect(bodies[0]).toMatchObject({ expected_version: 2, moldy_pct: '3' });
    });

    it('sends nothing without changes', async () => {
      const bodies: unknown[] = [];
      server.use(
        qualityWriteHandler('evaluation-correction', evaluated(), bodies),
      );
      renderScreen('?vista=evaluados');

      const dialog = await openCorrection();
      await fill(dialog, 'Bien fermentados (%)', '85');
      await userEvent.click(
        within(dialog).getByRole('button', { name: 'Guardar evaluación' }),
      );

      expect(
        await screen.findByText('No hubo cambios que guardar.'),
      ).toBeVisible();
      expect(bodies).toHaveLength(0);
    });

    it('loads the values of whoever corrected first', async () => {
      const newer = lotIn('evaluated', {
        evaluation: buildQualityEvaluation({ version: 3, moldy_pct: '4.0' }),
      });
      server.use(
        qualityWriteHandler(
          'evaluation-correction',
          conflict('stale_version', { current: newer }),
        ),
      );
      renderScreen('?vista=evaluados');

      const dialog = await openCorrection();
      await fill(dialog, 'Con moho (%)', '3');
      await userEvent.click(
        within(dialog).getByRole('button', { name: 'Guardar evaluación' }),
      );

      expect(
        await within(dialog).findByText(
          /Otra persona corrigió esta evaluación/,
        ),
      ).toBeVisible();
      expect(within(dialog).getByLabelText('Con moho (%)')).toHaveValue('4.0');
    });
  });

  describe('from a link', () => {
    it('opens the form of the lot in the address', async () => {
      server.use(qualityDetailHandler(lotIn('dried')));
      renderScreen('?lote=l1&accion=evaluar');

      expect(
        await screen.findByRole('dialog', { name: `Evaluar · ${CODE}` }),
      ).toBeVisible();
    });

    it('says why when the lot moved on', async () => {
      server.use(qualityDetailHandler(evaluated()));
      renderScreen('?lote=l1&accion=evaluar');

      expect(
        await screen.findByText('El lote ya está evaluado.'),
      ).toBeVisible();
      expect(queryDialog()).toBeNull();
    });
  });
});
