import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { StatusBadge } from './status-badge';

describe('StatusBadge', () => {
  it('always pairs the color with an icon and text', () => {
    const { container } = render(<StatusBadge tone="ok">Activo</StatusBadge>);

    expect(screen.getByText('Activo')).toBeInTheDocument();
    expect(
      container.querySelector('svg[aria-hidden="true"]'),
    ).toBeInTheDocument();
  });
});
