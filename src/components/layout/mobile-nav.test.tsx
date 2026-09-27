import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Sprout } from 'lucide-react';
import { describe, expect, it, vi } from 'vitest';

import type { NavItem } from '@/config/navigation';

import { MobileNav } from './mobile-nav';

vi.mock('next/navigation', () => ({ usePathname: () => '/panel' }));

const items: NavItem[] = [
  { href: '/panel', label: 'Panel', icon: Sprout },
  { href: '/productores', label: 'Productores', icon: Sprout },
];

describe('MobileNav', () => {
  it('keeps the navigation closed until the button is pressed', async () => {
    render(<MobileNav items={items} />);

    expect(
      screen.queryByRole('link', { name: 'Panel' }),
    ).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Abrir menú' }));

    expect(
      await screen.findByRole('dialog', { name: 'Menú de navegación' }),
    ).toBeVisible();
    expect(screen.getByRole('link', { name: 'Panel' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Productores' })).toBeVisible();
  });

  it('closes when an entry is chosen', async () => {
    render(<MobileNav items={items} />);
    await userEvent.click(screen.getByRole('button', { name: 'Abrir menú' }));

    await userEvent.click(
      await screen.findByRole('link', { name: 'Productores' }),
    );

    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
  });

  it('closes with Escape and returns the focus to the button', async () => {
    render(<MobileNav items={items} />);
    const button = screen.getByRole('button', { name: 'Abrir menú' });
    await userEvent.click(button);
    await screen.findByRole('dialog');

    await userEvent.keyboard('{Escape}');

    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
    expect(button).toHaveFocus();
  });

  it('is not offered when there are no entries', () => {
    const { container } = render(<MobileNav items={[]} />);

    expect(container).toBeEmptyDOMElement();
  });
});
