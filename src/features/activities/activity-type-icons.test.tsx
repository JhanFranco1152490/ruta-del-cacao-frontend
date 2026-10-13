import { render } from '@testing-library/react';
import { Ellipsis } from 'lucide-react';
import { describe, expect, it } from 'vitest';

import { ACTIVITY_TYPE_OPTIONS } from './activity-labels';
import { ACTIVITY_TYPE_ICONS, ActivityTypeIcon } from './activity-type-icons';

describe('activity type icons', () => {
  it('has an icon for every type of labor', () => {
    for (const { value } of ACTIVITY_TYPE_OPTIONS) {
      expect(ACTIVITY_TYPE_ICONS[value]).toBeDefined();
    }
  });

  it('does not repeat an icon between types, so they can be told apart', () => {
    const icons = ACTIVITY_TYPE_OPTIONS.map(
      ({ value }) => ACTIVITY_TYPE_ICONS[value],
    );

    expect(new Set(icons).size).toBe(icons.length);
  });
});

describe('ActivityTypeIcon', () => {
  it('draws the icon of the type, hidden from screen readers', () => {
    const { container } = render(<ActivityTypeIcon type="pruning" />);

    const icon = container.querySelector('svg');
    expect(icon).toHaveAttribute('aria-hidden', 'true');
    expect(icon?.getAttribute('class')).toContain('lucide-scissors');
  });

  it('falls back to the generic one for a type this version does not know', () => {
    const { container } = render(<ActivityTypeIcon type="soil_analysis" />);
    const generic = render(<Ellipsis />).container;

    expect(container.querySelector('svg')?.innerHTML).toBe(
      generic.querySelector('svg')?.innerHTML,
    );
  });
});
