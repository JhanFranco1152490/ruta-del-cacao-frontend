import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { expectVisibleFocusOutline } from '@/test/focus-outline';

import { PasswordField } from './password-field';

describe('PasswordField', () => {
  it('toggles the visibility with an accessible button', async () => {
    const user = userEvent.setup();
    render(<PasswordField label="Contraseña" />);
    const input = screen.getByLabelText('Contraseña');

    expect(input).toHaveAttribute('type', 'password');
    await user.click(
      screen.getByRole('button', { name: 'Mostrar contraseña' }),
    );
    expect(input).toHaveAttribute('type', 'text');
    expect(
      screen.getByRole('button', { name: 'Ocultar contraseña' }),
    ).toHaveAttribute('aria-pressed', 'true');
  });

  it('keeps the visible focus outline with and without an error', () => {
    const { rerender } = render(<PasswordField label="Contraseña" />);
    expectVisibleFocusOutline(screen.getByLabelText('Contraseña'));

    rerender(<PasswordField label="Contraseña" error="Requerida." />);
    expectVisibleFocusOutline(screen.getByLabelText('Contraseña'));
  });
});
