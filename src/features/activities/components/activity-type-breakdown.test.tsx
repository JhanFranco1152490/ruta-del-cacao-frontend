import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ActivityTypeBreakdown } from './activity-type-breakdown';

describe('ActivityTypeBreakdown', () => {
  it('lists the labors by type with how many there are, as it comes', () => {
    render(
      <ActivityTypeBreakdown
        rows={[
          { type: 'pruning', label: 'Poda', count: 4 },
          { type: 'irrigation', label: 'Riego', count: 1 },
        ]}
      />,
    );

    const list = screen.getByRole('list', { name: 'Por tipo de labor' });
    expect(
      within(list)
        .getAllByRole('listitem')
        .map((row) => row.textContent),
    ).toEqual(['Poda4', 'Riego1']);
  });

  it('is collapsed until it is opened', () => {
    const { container } = render(
      <ActivityTypeBreakdown
        rows={[{ type: 'pruning', label: 'Poda', count: 1 }]}
      />,
    );

    expect(container.querySelector('details')).not.toHaveAttribute('open');
  });

  it('shows nothing without activities', () => {
    const { container } = render(<ActivityTypeBreakdown rows={[]} />);

    expect(container).toBeEmptyDOMElement();
  });
});
