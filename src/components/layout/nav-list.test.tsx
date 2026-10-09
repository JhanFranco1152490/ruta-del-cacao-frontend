import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Sprout } from 'lucide-react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { NavItem } from '@/types/navigation';

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

  it('marks only the section that claims a route under another one', () => {
    pathname.current = '/productores/fichas/nueva';
    render(
      <NavList
        items={[
          ...items,
          {
            href: '/fichas',
            label: 'Fichas',
            icon: Sprout,
            routes: ['/productores/fichas'],
          },
        ]}
      />,
    );

    expect(screen.getByRole('link', { name: 'Fichas' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(
      screen.getByRole('link', { name: 'Productores' }),
    ).not.toHaveAttribute('aria-current');
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

  describe('submenus', () => {
    const withChildren: NavItem[] = [
      {
        href: '/fincas',
        label: 'Fincas',
        icon: Sprout,
        children: [
          {
            href: '/fincas/parcelas/nueva',
            label: 'Registrar parcela',
            icon: Sprout,
          },
        ],
      },
    ];

    it('shows the tasks under their section and folds them on request', async () => {
      pathname.current = '/productores';
      render(<NavList items={withChildren} />);

      expect(
        screen.getByRole('link', { name: 'Registrar parcela' }),
      ).toHaveAttribute('href', '/fincas/parcelas/nueva');

      await userEvent.click(
        screen.getByRole('button', { name: 'Plegar el submenú de Fincas' }),
      );
      expect(
        screen.queryByRole('link', { name: 'Registrar parcela' }),
      ).not.toBeInTheDocument();

      await userEvent.click(
        screen.getByRole('button', { name: 'Desplegar el submenú de Fincas' }),
      );
      expect(
        screen.getByRole('link', { name: 'Registrar parcela' }),
      ).toBeInTheDocument();
    });

    it('puts the emphasis on the task and keeps the section marked', () => {
      pathname.current = '/fincas/parcelas/nueva';
      render(<NavList items={withChildren} />);

      expect(
        screen.getByRole('link', { name: 'Registrar parcela' }),
      ).toHaveAttribute('aria-current', 'page');
      expect(screen.getByRole('link', { name: 'Fincas' })).not.toHaveAttribute(
        'aria-current',
      );
    });

    it('does not hide the task the person is in, even when folded', async () => {
      pathname.current = '/fincas/parcelas/nueva';
      render(<NavList items={withChildren} />);

      await userEvent.click(
        screen.getByRole('button', { name: 'Plegar el submenú de Fincas' }),
      );

      expect(
        screen.getByRole('link', { name: 'Registrar parcela' }),
      ).toBeInTheDocument();
    });
  });
});
