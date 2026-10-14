import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { SelectField } from './select-field';

describe('SelectField', () => {
  it('leaves the focus outline to the global rule, without a competing halo', () => {
    render(
      <SelectField label="Municipio" error="Elige un municipio.">
        <option value="">Selecciona</option>
      </SelectField>,
    );
    const select = screen.getByLabelText('Municipio');

    expect(select).toHaveAttribute('aria-invalid', 'true');
    expect(select.className).not.toMatch(/outline-none|focus-visible:ring/);
  });

  describe('with a placeholder', () => {
    function renderWithPlaceholder(props: { value?: string } = {}) {
      render(
        <SelectField
          label="Finca"
          onChange={() => {}}
          placeholder="Elige una finca"
          {...props}
        >
          <option value="f1">La Esperanza</option>
          <option value="f2">El Roble</option>
        </SelectField>,
      );
      return screen.getByLabelText('Finca');
    }

    it('shows the text while nothing is chosen, not the first option', () => {
      const select = renderWithPlaceholder();

      expect(select).toHaveValue('');
      expect(select).toHaveDisplayValue('Elige una finca');
    });

    it('does not offer the text as an option to choose', () => {
      renderWithPlaceholder();

      expect(
        screen.queryByRole('option', { name: 'Elige una finca' }),
      ).not.toBeInTheDocument();
      expect(
        screen.getByRole('option', { name: 'La Esperanza' }),
      ).toBeInTheDocument();
    });

    it('shows the text when the value it is given is empty', () => {
      const select = renderWithPlaceholder({ value: '' });

      expect(select).toHaveDisplayValue('Elige una finca');
    });

    it('shows the chosen option once there is one', async () => {
      const select = renderWithPlaceholder();

      await userEvent.selectOptions(select, 'f2');

      expect(select).toHaveDisplayValue('El Roble');
    });
  });
});
