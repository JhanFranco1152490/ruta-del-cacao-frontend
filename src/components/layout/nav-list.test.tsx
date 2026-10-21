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

  describe('groups', () => {
    const entry = (href: string, group?: NavItem['group']): NavItem => ({
      href,
      label: href.slice(1),
      icon: Sprout,
      group,
    });
    const few = [
      entry('/productores', 'admin'),
      entry('/fincas', 'farm'),
      entry('/actividades', 'agriculture'),
    ];
    // Más de diez entradas: los grupos empiezan plegados.
    const many = [
      entry('/productores', 'admin'),
      entry('/fincas', 'farm'),
      entry('/parcelas', 'farm'),
      entry('/insumos', 'farm'),
      entry('/actividades', 'agriculture'),
      entry('/sanidad', 'agriculture'),
      entry('/cosechas', 'postharvest'),
      entry('/lotes', 'postharvest'),
      entry('/infraestructura', 'postharvest'),
      entry('/usuarios', 'admin'),
      entry('/roles', 'admin'),
    ];

    beforeEach(() => {
      window.localStorage.clear();
    });

    it('names each group when the person has two or more', () => {
      pathname.current = '/productores';
      render(<NavList items={few} />);

      expect(screen.getByRole('button', { name: 'Finca' })).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Manejo agrícola' }),
      ).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'fincas' })).toBeInTheDocument();
    });

    it('leaves the menu flat when there is only one group', () => {
      render(
        <NavList
          items={[entry('/fincas', 'farm'), entry('/parcelas', 'farm')]}
        />,
      );

      expect(screen.queryByRole('button', { name: 'Finca' })).toBeNull();
      expect(screen.getAllByRole('link')).toHaveLength(2);
    });

    it('keeps an entry without a group on top, outside any heading', () => {
      pathname.current = '/fincas';
      render(<NavList items={[entry('/inicio'), ...few]} />);

      const links = screen.getAllByRole('link').map((l) => l.textContent);
      expect(links[0]).toBe('inicio');
    });

    it('starts with every group open when the menu is short', () => {
      pathname.current = '/productores';
      render(<NavList items={few} />);

      expect(screen.getByRole('button', { name: 'Finca' })).toHaveAttribute(
        'aria-expanded',
        'true',
      );
      expect(screen.getByRole('link', { name: 'actividades' })).toBeVisible();
    });

    it('keeps the groups open for ten entries, which fit', () => {
      pathname.current = '/lotes';
      render(<NavList items={many.slice(0, 10)} />);

      expect(screen.getByRole('button', { name: 'Finca' })).toHaveAttribute(
        'aria-expanded',
        'true',
      );
    });

    it('starts with the groups folded when the menu is long, except the current one', () => {
      pathname.current = '/lotes';
      render(<NavList items={many} />);

      expect(
        screen.getByRole('button', { name: 'Cosecha y poscosecha' }),
      ).toHaveAttribute('aria-expanded', 'true');
      expect(screen.getByRole('button', { name: 'Finca' })).toHaveAttribute(
        'aria-expanded',
        'false',
      );
      expect(screen.queryByRole('link', { name: 'fincas' })).toBeNull();
    });

    it('opens a folded group on request, and folds it again', async () => {
      pathname.current = '/lotes';
      render(<NavList items={many} />);

      await userEvent.click(screen.getByRole('button', { name: 'Finca' }));
      expect(screen.getByRole('link', { name: 'fincas' })).toBeInTheDocument();

      await userEvent.click(screen.getByRole('button', { name: 'Finca' }));
      expect(screen.queryByRole('link', { name: 'fincas' })).toBeNull();
    });

    it('does not fold the group the person is in', async () => {
      pathname.current = '/lotes';
      render(<NavList items={many} />);

      await userEvent.click(
        screen.getByRole('button', { name: 'Cosecha y poscosecha' }),
      );

      expect(screen.getByRole('link', { name: 'lotes' })).toBeInTheDocument();
    });

    it('remembers what the person chose on the next visit', async () => {
      pathname.current = '/lotes';
      const first = render(<NavList items={many} />);
      await userEvent.click(screen.getByRole('button', { name: 'Finca' }));
      first.unmount();

      render(<NavList items={many} />);

      expect(screen.getByRole('button', { name: 'Finca' })).toHaveAttribute(
        'aria-expanded',
        'true',
      );
    });

    it('follows the default when the stored choice is garbage', () => {
      window.localStorage.setItem('nav-groups-folded', '{no es json');
      pathname.current = '/lotes';
      render(<NavList items={many} />);

      expect(screen.getByRole('button', { name: 'Finca' })).toHaveAttribute(
        'aria-expanded',
        'false',
      );
    });
  });
});
