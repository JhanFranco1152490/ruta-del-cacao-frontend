import { render, screen } from '@testing-library/react';
import { Sprout } from 'lucide-react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { NavItem } from '@/config/navigation';

import { NavList } from './nav-list';

const pathname = vi.hoisted(() => ({ current: '/panel' }));
vi.mock('next/navigation', () => ({ usePathname: () => pathname.current }));

const items: NavItem[] = [
  { href: '/panel', label: 'Panel', icon: Sprout },
  { href: '/productores', label: 'Productores', icon: Sprout },
];

beforeEach(() => {
  pathname.current = '/panel';
});

describe('NavList', () => {
  it('lists every entry as a link inside a named navigation', () => {
    render(<NavList items={items} />);

    expect(
      screen.getByRole('navigation', { name: 'Principal' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Panel' })).toHaveAttribute(
      'href',
      '/panel',
    );
    expect(screen.getByRole('link', { name: 'Productores' })).toHaveAttribute(
      'href',
      '/productores',
    );
  });

  it('marks the current route with aria-current', () => {
    render(<NavList items={items} />);

    expect(screen.getByRole('link', { name: 'Panel' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(
      screen.getByRole('link', { name: 'Productores' }),
    ).not.toHaveAttribute('aria-current');
  });

  it('keeps a section active on its child routes', () => {
    pathname.current = '/productores/nuevo';
    render(<NavList items={items} />);

    expect(screen.getByRole('link', { name: 'Productores' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByRole('link', { name: 'Panel' })).not.toHaveAttribute(
      'aria-current',
    );
  });

  it('does not mark a route that only shares the prefix text', () => {
    pathname.current = '/productores-x';
    render(<NavList items={items} />);

    expect(
      screen.getByRole('link', { name: 'Productores' }),
    ).not.toHaveAttribute('aria-current');
  });

  it('draws nothing when there are no entries', () => {
    const { container } = render(<NavList items={[]} />);

    expect(container).toBeEmptyDOMElement();
  });
});
