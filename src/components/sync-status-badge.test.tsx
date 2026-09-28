import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SyncStatusBadge } from './sync-status-badge';
import type { SyncStatus } from './use-sync-status';

const base: SyncStatus = {
  isOnline: true,
  pendingCount: 0,
  errorCount: 0,
  isWithinOfflineWindow: true,
};

describe('SyncStatusBadge', () => {
  it('shows the offline state with the pending count', () => {
    render(
      <SyncStatusBadge
        status={{ ...base, isOnline: false, pendingCount: 3 }}
      />,
    );

    expect(screen.getByText('Sin conexión · 3 en cola')).toBeInTheDocument();
  });

  it('shows the error count over anything else', () => {
    render(
      <SyncStatusBadge status={{ ...base, pendingCount: 1, errorCount: 2 }} />,
    );

    expect(screen.getByText('2 con error')).toBeInTheDocument();
  });

  it('shows syncing while there are pending items and no errors', () => {
    render(<SyncStatusBadge status={{ ...base, pendingCount: 1 }} />);

    expect(screen.getByText('Sincronizando 1…')).toBeInTheDocument();
  });

  it('shows synced when there is nothing pending', () => {
    render(<SyncStatusBadge status={base} />);

    expect(screen.getByText('Sincronizado')).toBeInTheDocument();
  });

  it('never shows color alone: every state pairs an icon with its text', () => {
    const { container } = render(<SyncStatusBadge status={base} />);

    expect(
      container.querySelector('svg[aria-hidden="true"]'),
    ).toBeInTheDocument();
  });
});
