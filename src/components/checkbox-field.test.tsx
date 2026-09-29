import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { expectVisibleFocusOutline } from '@/test/focus-outline';

import { CheckboxField } from './checkbox-field';

describe('CheckboxField', () => {
  it('toggles through its label and keyboard', async () => {
    const user = userEvent.setup();
    render(<CheckboxField label="Consultar usuarios" />);
    const checkbox = screen.getByRole('checkbox', {
      name: 'Consultar usuarios',
    });

    expect(checkbox).not.toBeChecked();
    await user.click(screen.getByText('Consultar usuarios'));
    expect(checkbox).toBeChecked();
    checkbox.focus();
    await user.keyboard(' ');
    expect(checkbox).not.toBeChecked();
    expectVisibleFocusOutline(checkbox);
  });

  it('supports controlled selection', async () => {
    function ControlledField() {
      const [checked, setChecked] = useState(true);
      return (
        <CheckboxField
          label="Consultar roles"
          checked={checked}
          onCheckedChange={setChecked}
        />
      );
    }
    render(<ControlledField />);
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeChecked();
    await userEvent.click(checkbox);
    expect(checkbox).not.toBeChecked();
  });

  it('explains a disabled permission and prevents changes', async () => {
    const onCheckedChange = vi.fn();
    render(
      <CheckboxField
        label="Administrar roles"
        disabled
        hint="No puedes conceder este permiso."
        onCheckedChange={onCheckedChange}
      />,
    );
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toHaveAttribute('aria-disabled', 'true');
    expect(checkbox).toHaveAccessibleDescription(
      'No puedes conceder este permiso.',
    );
    await userEvent.click(screen.getByText('Administrar roles'));
    await userEvent.tab();
    expect(checkbox).not.toHaveFocus();
    expect(checkbox).not.toBeChecked();
    expect(onCheckedChange).not.toHaveBeenCalled();
  });

  it('associates validation errors and keeps visible focus', () => {
    render(
      <CheckboxField
        label="Consultar usuarios"
        error="Selecciona un permiso."
      />,
    );
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toHaveAttribute('aria-invalid', 'true');
    expect(checkbox).toHaveAccessibleDescription('Selecciona un permiso.');
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Selecciona un permiso.',
    );
    expectVisibleFocusOutline(checkbox);
  });

  it('assigns distinct identifiers to independent fields', () => {
    render(
      <>
        <CheckboxField label="Consultar usuarios" hint="Ver cuentas" />
        <CheckboxField label="Consultar roles" hint="Ver roles" />
      </>,
    );
    const first = screen.getByRole('checkbox', { name: 'Consultar usuarios' });
    const second = screen.getByRole('checkbox', { name: 'Consultar roles' });
    expect(first.id).not.toBe(second.id);
    expect(first).toHaveAccessibleDescription('Ver cuentas');
    expect(second).toHaveAccessibleDescription('Ver roles');
  });
});
