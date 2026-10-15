import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { FilterRow } from './filter-row';

describe('FilterRow', () => {
  it('opens the rest of the filters with the button and counts the active ones', async () => {
    const user = userEvent.setup();
    render(
      <FilterRow activeCount={2} search={<input aria-label="Buscar" />}>
        <select aria-label="Estado" />
      </FilterRow>,
    );

    const toggle = screen.getByRole('button', { name: /Filtros/ });
    expect(toggle).toHaveTextContent('2');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');

    await user.click(toggle);

    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByLabelText('Estado')).toBeInTheDocument();
  });

  it('has no «Filtros» button when there is nothing else to filter by', () => {
    render(<FilterRow search={<input aria-label="Buscar" />} />);

    expect(
      screen.queryByRole('button', { name: /Filtros/ }),
    ).not.toBeInTheDocument();
  });

  it('keeps the less used filters behind «Más filtros» and counts them', async () => {
    const user = userEvent.setup();
    render(
      <FilterRow
        more={<select aria-label="Municipio" />}
        moreActiveCount={1}
        search={<input aria-label="Buscar" />}
      />,
    );

    const toggle = screen.getByRole('button', { name: /Más filtros/ });
    expect(toggle).toHaveTextContent('1');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');

    await user.click(toggle);

    expect(toggle).toHaveAttribute('aria-expanded', 'true');
  });
});
