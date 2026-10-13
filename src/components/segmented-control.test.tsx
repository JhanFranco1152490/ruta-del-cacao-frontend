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

  it('is lower and tighter when it is compact, and works the same', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <SegmentedControl
        compact
        label="Opciones"
        onChange={onChange}
        options={OPTIONS}
        value="a"
      />,
    );

    const button = screen.getByRole('button', { name: 'Segunda' });
    expect(button).toHaveClass('min-h-9');
    await user.click(button);
    expect(onChange).toHaveBeenCalledWith('b');
  });

  it('keeps the usual height when it is not compact', () => {
    render(
      <SegmentedControl
        label="Opciones"
        onChange={vi.fn()}
        options={OPTIONS}
        value="a"
      />,
    );

    expect(screen.getByRole('button', { name: 'Primera' })).toHaveClass(
      'min-h-11',
    );
  });
});
