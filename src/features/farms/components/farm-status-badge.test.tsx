import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { FarmStatusBadge } from './farm-status-badge';

describe('FarmStatusBadge', () => {
  it.each([
    ['active', 'Activa'],
    ['inactive', 'Inactiva'],
    ['pending', 'Pendiente de sincronización'],
    ['error', 'Pendiente con error'],
  ] as const)('shows %s with text and an icon', (status, label) => {
    const { container } = render(<FarmStatusBadge status={status} />);

    expect(screen.getByText(label)).toBeInTheDocument();
    expect(
      container.querySelector('svg[aria-hidden="true"]'),
    ).toBeInTheDocument();
  });
});
