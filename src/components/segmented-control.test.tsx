import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { SegmentedControl } from './segmented-control';

const OPTIONS = [
  { value: 'a', label: 'Primera' },
  { value: 'b', label: 'Segunda' },
] as const;

describe('SegmentedControl', () => {
  it('marks the chosen option and reports a new choice', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <SegmentedControl
        label="Opciones"
        onChange={onChange}
        options={OPTIONS}
        value="a"
      />,
    );

    expect(screen.getByRole('group', { name: 'Opciones' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Primera' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await user.click(screen.getByRole('button', { name: 'Segunda' }));

    expect(onChange).toHaveBeenCalledWith('b');
  });
});
