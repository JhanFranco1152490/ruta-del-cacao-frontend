import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { StatusBadge } from './status-badge';

describe('StatusBadge', () => {
  it.each(['ok', 'warn', 'err', 'info'] as const)(
    'always pairs the %s color with an icon and text',
    (tone) => {
      const { container } = render(
        <StatusBadge tone={tone}>Estado</StatusBadge>,
      );

      expect(screen.getByText('Estado')).toBeInTheDocument();
      expect(
        container.querySelector('svg[aria-hidden="true"]'),
      ).toBeInTheDocument();
    },
  );
});
