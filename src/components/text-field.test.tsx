import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { expectVisibleFocusOutline } from '@/test/focus-outline';

import { TextField } from './text-field';

describe('TextField', () => {
  it('links label, hint and error to the input for assistive technology', () => {
    render(
      <TextField
        label="Correo"
        hint="Usa tu correo personal"
        error="Correo inválido."
      />,
    );
    const input = screen.getByLabelText('Correo');

    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('Correo inválido.');
    expect(screen.getByRole('alert')).toHaveTextContent('Correo inválido.');
  });

  it('shows the hint when there is no error', () => {
    render(<TextField label="Correo" hint="Usa tu correo personal" />);

    expect(screen.getByLabelText('Correo')).toHaveAccessibleDescription(
      'Usa tu correo personal',
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('keeps the visible focus outline with and without an error', () => {
    const { rerender } = render(<TextField label="Correo" />);
    expectVisibleFocusOutline(screen.getByLabelText('Correo'));

    rerender(<TextField label="Correo" error="Correo inválido." />);
    expectVisibleFocusOutline(screen.getByLabelText('Correo'));
  });
});
