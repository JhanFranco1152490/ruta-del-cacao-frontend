import { screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { queryKeys } from '@/lib/api/query-keys';
import { PERMISSIONS } from '@/lib/permissions';
import { buildSession } from '@/test/factories';
import { lotHistoryHandler } from '@/test/handlers';
import { buildLotHistory } from '@/test/lot-history-factories';
import { createTestQueryClient, renderWithProviders } from '@/test/render';
import { mockLocation, resetLocation } from '@/test/router';
import { server } from '@/test/server';

vi.mock(
  'next/navigation',
  async () => (await import('@/test/router')).navigation,
);

import { LotHistoryFromQuery } from './lot-history-from-query';

function renderPage(permissions: string[]) {
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(queryKeys.session(), buildSession({ permissions }));
  renderWithProviders(<LotHistoryFromQuery />, { queryClient });
}

const harvestLinks = async () =>
  within(await screen.findByRole('listitem', { name: 'Cosecha' }))
    .queryAllByRole('link')
    .map((link) => link.textContent?.trim());

beforeEach(() => {
  resetLocation();
  mockLocation.path = '/lotes/historia';
  mockLocation.search = 'id=l1';
  server.use(lotHistoryHandler(buildLotHistory()));
});

describe('LotHistoryFromQuery', () => {
  it('links the harvest, the plot health and its activities with their permissions', async () => {
    renderPage([
      PERMISSIONS.LOTS_VIEW,
      PERMISSIONS.HARVESTS_VIEW,
      PERMISSIONS.ACTIVITIES_VIEW,
    ]);

    expect(await harvestLinks()).toEqual([
      'Ver la cosecha',
      'Sanidad de la parcela',
      'Actividades de la parcela',
    ]);
    expect(
      screen.getByRole('link', { name: 'Sanidad de la parcela' }),
    ).toHaveAttribute(
      'href',
      expect.stringContaining('/sanidad?vista=historial&finca=f1&parcela=pl1'),
    );
    expect(
      screen.getByRole('link', { name: 'Actividades de la parcela' }),
    ).toHaveAttribute(
      'href',
      expect.stringContaining('/actividades?finca=f1&parcela=pl1'),
    );
  });

  it('links nothing of the origin with only the lots permission', async () => {
    renderPage([PERMISSIONS.LOTS_VIEW]);

    expect(await harvestLinks()).toEqual([]);
  });

  it('says when no lot was given', () => {
    mockLocation.search = '';
    renderPage([PERMISSIONS.LOTS_VIEW]);

    expect(
      screen.getByText('No se indicó de qué lote ver la historia.'),
    ).toBeVisible();
  });
});
