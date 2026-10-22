import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import AppTemplate from './template';

describe('AppTemplate', () => {
  it('wraps the screen in a fade so a navigation does not swap it abruptly', () => {
    render(
      <AppTemplate>
        <p>Contenido</p>
      </AppTemplate>,
    );

    expect(screen.getByText('Contenido').parentElement).toHaveClass(
      'motion-fade',
    );
  });
});
