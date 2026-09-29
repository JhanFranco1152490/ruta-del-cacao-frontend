import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '@/test/render';
import ActivationPage, { metadata } from './page';

describe('activation page', () => {
  it('keeps the token out of referrer headers', () => {
    expect(metadata.referrer).toBe('no-referrer');
  });

  it.each([
    {},
    { uid: 'u' },
    { token: 't' },
    { uid: 'u', token: '' },
    { uid: 'u', token: ['first', 'second'] },
    { uid: ['first', 'second'], token: 't' },
  ])(
    'rejects incomplete or repeated parameters %o without calling the API',
    async (params) => {
      const page = await ActivationPage({
        searchParams: Promise.resolve(params),
        params: Promise.resolve({}),
      });
      renderWithProviders(page);
      expect(screen.getByRole('alert')).toHaveTextContent(
        'pide a quien creó tu cuenta',
      );
      expect(
        screen.queryByRole('button', { name: 'Activar cuenta' }),
      ).not.toBeInTheDocument();
    },
  );
});
