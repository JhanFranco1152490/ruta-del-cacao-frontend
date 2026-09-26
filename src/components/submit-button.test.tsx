import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { expectVisibleFocusOutline } from '@/test/focus-outline';

import { SubmitButton } from './submit-button';

describe('SubmitButton', () => {
  it('keeps the visible focus outline', () => {
    render(<SubmitButton pending={false}>Guardar</SubmitButton>);

    expectVisibleFocusOutline(screen.getByRole('button', { name: 'Guardar' }));
  });

  it('is enabled and shows its label while idle', () => {
    render(<SubmitButton pending={false}>Guardar</SubmitButton>);

    expect(screen.getByRole('button', { name: 'Guardar' })).toBeEnabled();
  });

  it('is disabled and shows the pending label while pending', () => {
    render(<SubmitButton pending>Guardar</SubmitButton>);

    expect(screen.getByRole('button', { name: 'Procesando…' })).toBeDisabled();
    expect(
      screen.queryByRole('button', { name: 'Guardar' }),
    ).not.toBeInTheDocument();
  });

  it('accepts its own pending label', () => {
    render(
      <SubmitButton pending pendingLabel="Enviando…">
        Guardar
      </SubmitButton>,
    );

    expect(screen.getByRole('button', { name: 'Enviando…' })).toBeDisabled();
  });
});
