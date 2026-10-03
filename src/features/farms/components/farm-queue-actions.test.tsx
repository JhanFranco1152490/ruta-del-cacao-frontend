import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderWithProviders } from '@/test/render';

import type { FarmListItem } from '../farm-list-item';
import { FARM_DELETED_CODE } from '../sync-adapter';
import { FarmQueueActions } from './farm-queue-actions';

const failedEdit: FarmListItem = {
  id: 's1',
  name: 'La Esperanza',
  municipalityCode: '54001',
  details: '',
  areaHectares: '12.50',
  location: { latitude: '7.8939', longitude: '-72.5078' },
  status: 'error',
  queuedAs: 'update',
};

describe('FarmQueueActions', () => {
  it('lets a failed edit be corrected or discarded', () => {
    renderWithProviders(<FarmQueueActions farm={failedEdit} />);

    expect(
      screen.getByRole('link', { name: 'Corregir La Esperanza' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Descartar' }),
    ).toBeInTheDocument();
  });

  // Corregir no sirve: la finca ya no existe en el servidor.
  it('only offers to discard an edit of a farm that was deleted', () => {
    renderWithProviders(
      <FarmQueueActions
        farm={{ ...failedEdit, errorCode: FARM_DELETED_CODE }}
      />,
    );

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Descartar' }),
    ).toBeInTheDocument();
  });
});
