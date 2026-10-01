import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { OfflineBanner } from './offline-banner';
import type { SyncStatus } from '@/types/sync';

const baseStatus: SyncStatus = {
  isOnline: true,
  pendingCount: 0,
  errorCount: 0,
  isWithinOfflineWindow: true,
};

describe('OfflineBanner', () => {
  it('explains that offline changes are saved on the device', () => {
    render(
      <OfflineBanner
        status={{ ...baseStatus, isOnline: false, pendingCount: 2 }}
      />,
    );

    expect(screen.getByRole('status')).toHaveTextContent('Sin conexión');
    expect(screen.getByRole('status')).toHaveTextContent('2 registros en cola');
    expect(screen.getByRole('status')).toHaveTextContent(
      'Los cambios se guardarán en este dispositivo.',
    );
  });

  it('reports pending synchronization while online', () => {
    render(<OfflineBanner status={{ ...baseStatus, pendingCount: 1 }} />);

    expect(screen.getByRole('status')).toHaveTextContent('Con conexión');
    expect(screen.getByRole('status')).toHaveTextContent(
      '1 registro pendiente de sincronización.',
    );
  });

  it('prioritizes records that need review', () => {
    render(
      <OfflineBanner
        status={{ ...baseStatus, pendingCount: 1, errorCount: 2 }}
      />,
    );

    expect(screen.getByRole('status')).toHaveTextContent(
      '2 registros requieren revisión antes de sincronizarse.',
    );
  });

  it('asks the person to sign in again after the offline window ends', () => {
    render(
      <OfflineBanner
        status={{
          ...baseStatus,
          isOnline: false,
          isWithinOfflineWindow: false,
        }}
      />,
    );

    expect(screen.getByRole('status')).toHaveTextContent(
      'Inicia sesión cuando recuperes la conexión antes de registrar más cambios.',
    );
  });
});
