import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { LocationLink } from './location-link';

describe('LocationLink', () => {
  it('opens the point in Google Maps in another tab', () => {
    render(
      <LocationLink
        coordinates={{ latitude: '7.8804954', longitude: '-72.4646854' }}
      />,
    );

    const link = screen.getByRole('link', { name: /7\.8804954, -72\.4646854/ });
    expect(link).toHaveAttribute(
      'href',
      'https://www.google.com/maps/search/?api=1&query=7.8804954,-72.4646854',
    );
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
    expect(link).toHaveAccessibleName(/Abrir en Google Maps/);
  });

  it('shows the text without a link when it is not a possible point', () => {
    render(<LocationLink coordinates={{ latitude: '95', longitude: '10' }} />);

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByText('95, 10')).toBeInTheDocument();
  });
});
