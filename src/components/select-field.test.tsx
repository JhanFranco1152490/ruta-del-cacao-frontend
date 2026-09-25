import { render, screen } from '@testing-library/react';
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
});
