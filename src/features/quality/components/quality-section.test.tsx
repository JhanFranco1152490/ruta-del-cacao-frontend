import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';

import { queryKeys } from '@/lib/api/query-keys';
import type { SectionPickControl } from '@/components/page-blocks/section-item';
import { PERMISSIONS } from '@/lib/permissions';
import {
  buildLotQuality,
  buildQualityEvaluation,
  buildSession,
} from '@/test/factories';
import { apiUrl, qualityDetailHandler } from '@/test/handlers';
import { createTestQueryClient, renderWithProviders } from '@/test/render';
import { server } from '@/test/server';

vi.mock(
  'next/navigation',
  async () => (await import('@/test/router')).navigation,
);

import { QualitySection, type QualitySectionLot } from './quality-section';

const ALL = [
  PERMISSIONS.QUALITY_EVALUATE,
  PERMISSIONS.QUALITY_CLASSIFY,
  PERMISSIONS.QUALITY_DISCARD,
];

const evaluatedSummary = {
  well_fermented_pct: '85.0',
  moldy_pct: '2.0',
  other_defects_pct: '5.0',
  evaluated_at: '2026-10-30T09:00:00-05:00',
  g1_kg: null,
  g2_kg: null,
  discard_kg: null,
  discard_reason: null,
  discarded_at: null,
};

const lot = (
  overrides: Partial<QualitySectionLot> = {},
): QualitySectionLot => ({
  id: 'l1',
  code: '000123-F02-P05-261014-1',
  status: 'dried',
  quality: null,
  dryWeightKg: '62.5',
  ...overrides,
});

function renderSection(
  section: QualitySectionLot,
  permissions = ALL,
  pick?: SectionPickControl,
) {
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(
    queryKeys.session(),
    buildSession({ id: `quality-section-${crypto.randomUUID()}`, permissions }),
  );
  return renderWithProviders(<QualitySection lot={section} pick={pick} />, {
    queryClient,
  });
}

const section = () => screen.findByRole('region', { name: 'Calidad' });

describe('QualitySection', () => {
  it('takes no place before the lot is dry', () => {
    renderSection(lot({ status: 'drying' }));

    expect(screen.queryByRole('region', { name: 'Calidad' })).toBeNull();
  });

  it('waits for the evaluation of a dry lot and leads to evaluate it', async () => {
    server.use(qualityDetailHandler(buildLotQuality()));
    renderSection(lot());

    const card = await section();
    expect(card).toHaveTextContent('Pendiente de evaluación.');
    expect(within(card).getByRole('link', { name: /Evaluar/ })).toHaveAttribute(
      'href',
      expect.stringMatching(/^\/calidad\?lote=l1&accion=evaluar/),
    );
  });

  it('shows the evaluation with who did it and the actions that follow', async () => {
    server.use(
      qualityDetailHandler(
        buildLotQuality({
          lot: { ...buildLotQuality().lot, status: 'evaluated' },
          evaluation: buildQualityEvaluation({ notes: 'Buen corte' }),
        }),
      ),
    );
    renderSection(lot({ status: 'evaluated', quality: evaluatedSummary }));

    const card = await section();
    expect(card).toHaveTextContent('Suma92,0 %');
    expect(
      await within(card).findByText('Evaluado por Cuenta de prueba el 30 oct'),
    ).toBeVisible();
    expect(card).toHaveTextContent('ObservacionesBuen corte');
    expect(
      within(card)
        .getAllByRole('link')
        .map((link) => link.textContent?.trim()),
    ).toEqual(['Clasificar', 'Corregir evaluación', 'Descartar lote']);
  });

  it('shows only what the lot brings to whoever cannot evaluate', async () => {
    let asked = false;
    server.use(
      http.get(apiUrl('/api/quality/:id'), () => {
        asked = true;
        return HttpResponse.json(buildLotQuality());
      }),
    );
    renderSection(lot({ status: 'evaluated', quality: evaluatedSummary }), []);

    const card = await section();
    expect(card).toHaveTextContent('Bien fermentados85,0 %');
    expect(card).not.toHaveTextContent('Evaluado por');
    expect(within(card).queryAllByRole('link')).toHaveLength(0);
    expect(asked).toBe(false);
  });

  it('shows the grades in kilos and as a share of the dry weight', async () => {
    renderSection(
      lot({
        status: 'classified',
        quality: {
          ...evaluatedSummary,
          g1_kg: '50.0',
          g2_kg: '6.5',
          discard_kg: '6.0',
          discard_reason: 'mold',
        },
      }),
      [],
    );

    const card = await section();
    expect(card).toHaveTextContent('G150,0 kg · 80,0 %');
    expect(card).toHaveTextContent('Motivo del descarteMoho');
  });

  it('warns that the whole lot was discarded', async () => {
    renderSection(
      lot({
        status: 'discarded',
        quality: {
          ...evaluatedSummary,
          discard_reason: 'mold',
          discarded_at: '2026-10-31T10:00:00-05:00',
        },
      }),
      [],
    );

    expect(
      await screen.findByText('Lote descartado el 31 oct. Motivo: Moho.'),
    ).toBeVisible();
  });

  it('shows its summary as an item of the stage list and selects itself when pressed', async () => {
    const onSelect = vi.fn();
    renderSection(
      lot({ status: 'evaluated', quality: evaluatedSummary }),
      ALL,
      { as: 'item', selected: false, onSelect, stage: 'current' },
    );

    const item = await screen.findByRole('button', { name: /Calidad/ });
    expect(item).toHaveTextContent('Evaluado · 85,0 % bien fermentados');
    await userEvent.click(item);
    expect(onSelect).toHaveBeenCalledOnce();
  });
});
