import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { FarmHills } from '@/components/illustrations/farm-hills';

import { EmptyState } from './empty-state';

describe('EmptyState', () => {
  it('shows the cacao plant when the screen gives no illustration', () => {
    const { container } = render(<EmptyState title="Aún no hay nada" />);

    expect(container.querySelectorAll('svg[aria-hidden="true"]')).toHaveLength(
      1,
    );
  });

  it('shows the illustration of the module', () => {
    const { container } = render(
      <EmptyState illustration={FarmHills} title="Aún no hay fincas" />,
    );

    expect(container.querySelector('svg')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Aún no hay fincas' }),
    ).toBeInTheDocument();
  });
});
