import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { expectVisibleFocusOutline } from '@/test/focus-outline';

import { TextAreaField } from './text-area-field';

describe('TextAreaField', () => {
  it('labels the text and describes it with its hint', () => {
    render(<TextAreaField hint="Lo que no cabe en números." label="Notas" />);

    const field = screen.getByLabelText('Notas');
    expect(field.tagName).toBe('TEXTAREA');
    expect(field).toHaveAccessibleDescription('Lo que no cabe en números.');
    expect(field).toHaveAttribute('aria-invalid', 'false');
  });

  it('marks the error and says it', () => {
    render(<TextAreaField error="Usa máximo 500 caracteres." label="Notas" />);

    const field = screen.getByLabelText('Notas');
    expect(field).toHaveAttribute('aria-invalid', 'true');
    expect(field).toHaveAccessibleDescription('Usa máximo 500 caracteres.');
  });

  it('shows the copper focus ring', () => {
    render(<TextAreaField label="Notas" />);

    expectVisibleFocusOutline(screen.getByLabelText('Notas'));
  });
});
