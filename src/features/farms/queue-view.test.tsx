import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { queryKeys } from '@/lib/api/query-keys';
import type { QueueItem } from '@/lib/offline/db';
import { buildSession } from '@/test/factories';
import { createTestQueryClient, renderWithProviders } from '@/test/render';

import { FARM_RESOURCE, toFields } from './farm-queue';
import { farmQueueView } from './queue-view';

const failed: QueueItem = {
  id: 'f1',
  resource: FARM_RESOURCE,
  operation: 'create',
  payload: {
    ...toFields({
      name: 'La Esperanza',
      municipality_id: '54001',
      details: 'Vereda El Pórtico',
      area_hectares: '12.50',
      altitude_masl: '950',
      latitude: '7.8234567',
      longitude: '-72.5123456',
    }),
    id: 'f1',
  },
  status: 'error',
  errorMessage: 'Ya existe',
  createdAt: 1,
  updatedAt: 1,
};

describe('farmQueueView', () => {
  it('names the farm', () => {
    expect(farmQueueView.title(failed)).toBe('La Esperanza');
  });

  it('offers to correct it and, since it failed, to discard it', () => {
    const { Actions } = farmQueueView;
    // Descartar lee la sesión: va ya cargada para no pedirla al servidor.
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(queryKeys.session(), buildSession());
    renderWithProviders(<Actions item={failed} onNavigate={vi.fn()} />, {
      queryClient,
    });

    expect(
      screen.getByRole('link', { name: 'Corregir La Esperanza' }),
    ).toHaveAttribute('href', '/fincas/editar?id=f1');
    expect(
      screen.getByRole('button', { name: 'Descartar' }),
    ).toBeInTheDocument();
  });
});
