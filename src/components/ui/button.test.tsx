import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Button } from './button';

describe('Button', () => {
  it('provides the copper field action for capture screens', () => {
    render(
      <Button size="field" variant="copper">
        Guardar en el teléfono
      </Button>,
    );

    const button = screen.getByRole('button', {
      name: 'Guardar en el teléfono',
    });
    expect(button).toHaveClass('bg-cobre', 'h-16', 'border-[2.5px]');
  });
});
