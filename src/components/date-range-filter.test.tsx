import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { DateRangeFilter } from './date-range-filter';

describe('DateRangeFilter', () => {
  it('shows both dates and reports a change to each one', () => {
    const onFrom = vi.fn();
    const onTo = vi.fn();
    render(
      <DateRangeFilter
        from="2026-01-01"
        onFrom={onFrom}
        onTo={onTo}
        to="2026-11-13"
      />,
    );

    expect(screen.getByLabelText('Desde')).toHaveValue('2026-01-01');
    expect(screen.getByLabelText('Hasta')).toHaveValue('2026-11-13');

    fireEvent.change(screen.getByLabelText('Desde'), {
      target: { value: '2026-02-01' },
    });
    fireEvent.change(screen.getByLabelText('Hasta'), {
      target: { value: '2026-03-31' },
    });

    expect(onFrom).toHaveBeenCalledWith('2026-02-01');
    expect(onTo).toHaveBeenCalledWith('2026-03-31');
  });

  it('leaves the dates empty when the period has none', () => {
    render(
      <DateRangeFilter from={null} onFrom={vi.fn()} onTo={vi.fn()} to={null} />,
    );

    expect(screen.getByLabelText('Desde')).toHaveValue('');
    expect(screen.getByLabelText('Hasta')).toHaveValue('');
  });

  it('names the dates after what they filter and shows the period error', () => {
    render(
      <DateRangeFilter
        error="La fecha final no puede ser anterior a la inicial."
        from="2026-11-05"
        fromLabel="Cerrados desde"
        onFrom={vi.fn()}
        onTo={vi.fn()}
        to="2026-11-04"
        toLabel="Cerrados hasta"
      />,
    );

    expect(screen.getByLabelText('Cerrados desde')).toHaveAccessibleDescription(
      'La fecha final no puede ser anterior a la inicial.',
    );
    expect(screen.getByLabelText('Cerrados hasta')).toBeInTheDocument();
  });
});
