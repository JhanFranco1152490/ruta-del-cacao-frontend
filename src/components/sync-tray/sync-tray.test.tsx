import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import type { QueueItem } from '@/lib/offline/db';
import type { SyncStatus } from '@/types/sync';

import type { QueueView } from './queue-view';
import { SyncTray } from './sync-tray';

const upToDate: SyncStatus = {
  isOnline: true,
  pendingCount: 0,
  errorCount: 0,
  isWithinOfflineWindow: true,
};
const item = (overrides: Partial<QueueItem>): QueueItem => ({
  id: 'q1',
  resource: 'farms',
  operation: 'create',
  payload: { name: 'La Esperanza' },
  status: 'pending',
  createdAt: 1,
  updatedAt: 1,
  ...overrides,
});
const nameOf = (queued: QueueItem) => (queued.payload as { name: string }).name;

function FakeActions({
  item: queued,
  onNavigate,
}: {
  item: QueueItem;
  onNavigate: () => void;
}) {
  return (
    <button type="button" onClick={onNavigate}>
      Corregir {nameOf(queued)}
    </button>
  );
}
const views: QueueView[] = [
  { resource: 'farms', kind: 'Finca', title: nameOf, Actions: FakeActions },
];

describe('SyncTray', () => {
  it('stays out of the header when everything is up to date', () => {
    render(<SyncTray status={upToDate} items={[]} views={views} />);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('shows the count and says it in words', () => {
    render(
      <SyncTray
        status={{ ...upToDate, isOnline: false, pendingCount: 1 }}
        items={[item({})]}
        views={views}
      />,
    );

    expect(
      screen.getByRole('button', { name: 'Sin conexión, 1 pendiente' }),
    ).toHaveTextContent('1');
  });

  it('groups what needs review and what is waiting', async () => {
    render(
      <SyncTray
        status={{ ...upToDate, pendingCount: 1, errorCount: 1 }}
        items={[
          item({
            id: 'e',
            status: 'error',
            errorMessage: 'Ya existe una finca con ese nombre',
            payload: { name: 'El Roble' },
          }),
          item({ id: 'p' }),
        ]}
        views={views}
      />,
    );

    await userEvent.click(
      screen.getByRole('button', { name: /registro con error/ }),
    );

    const review = await screen.findByRole('region', {
      name: 'Requieren revisión',
    });
    expect(review).toHaveTextContent('Finca · El Roble');
    expect(review).toHaveTextContent('Ya existe una finca con ese nombre');
    expect(
      screen.getByRole('region', { name: 'Pendientes de enviar' }),
    ).toHaveTextContent('Finca · La Esperanza');
  });

  it('shows a record of an unknown resource without hiding it', async () => {
    render(
      <SyncTray
        status={{ ...upToDate, pendingCount: 1 }}
        items={[item({ resource: 'plots' })]}
        views={views}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: '1 pendiente' }));

    expect(
      await screen.findByRole('region', { name: 'Pendientes de enviar' }),
    ).toHaveTextContent('Registro');
  });

  it('closes when an action takes the person to another screen', async () => {
    render(
      <SyncTray
        status={{ ...upToDate, pendingCount: 1 }}
        items={[item({})]}
        views={views}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: '1 pendiente' }));

    await userEvent.click(
      await screen.findByRole('button', { name: 'Corregir La Esperanza' }),
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('stays usable when the last record is sent while it is open', async () => {
    const { rerender } = render(
      <SyncTray
        status={{ ...upToDate, pendingCount: 1 }}
        items={[item({})]}
        views={views}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: '1 pendiente' }));

    rerender(<SyncTray status={upToDate} items={[]} views={views} />);

    expect(
      await screen.findByText(
        'No hay registros pendientes en este dispositivo.',
      ),
    ).toBeInTheDocument();
  });
});
