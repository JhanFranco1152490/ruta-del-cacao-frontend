import { screen } from '@testing-library/react';
import { Sprout } from 'lucide-react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { queryKeys } from '@/lib/api/query-keys';
import { PERMISSIONS } from '@/lib/permissions';
import { buildSession } from '@/test/factories';
import { createTestQueryClient, renderWithProviders } from '@/test/render';
import type { NavItem } from '@/types/navigation';

import { SectionGate } from './section-gate';

let pathname = '/';
vi.mock('next/navigation', () => ({ usePathname: () => pathname }));

const items: NavItem[] = [
  {
    href: '/productores',
    label: 'Productores',
    icon: Sprout,
    permission: PERMISSIONS.PRODUCERS_VIEW,
    needsConnection: true,
  },
  {
    href: '/fincas',
    label: 'Fincas',
    icon: Sprout,
    permission: PERMISSIONS.FARMS_VIEW,
  },
];

function renderAt(path: string, permissions: string[]) {
  pathname = path;
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(queryKeys.session(), buildSession({ permissions }));
  return renderWithProviders(
    <SectionGate items={items}>
      <p>Contenido</p>
    </SectionGate>,
    { queryClient },
  );
}

const offline = () =>
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);

afterEach(() => vi.restoreAllMocks());

describe('SectionGate', () => {
  it('shows a section the person has permission for, on any of its routes', () => {
    renderAt('/fincas/nueva', [PERMISSIONS.FARMS_VIEW]);

    expect(screen.getByText('Contenido')).toBeInTheDocument();
  });

  it('explains instead of showing a section without its permission, even on a child route', () => {
    renderAt('/productores/123', [PERMISSIONS.FARMS_VIEW]);

    expect(
      screen.getByText('No tienes permiso para ver esta sección'),
    ).toBeInTheDocument();
    expect(screen.queryByText('Contenido')).not.toBeInTheDocument();
  });

  it('says an office section needs a connection when there is none', () => {
    offline();
    renderAt('/productores', [PERMISSIONS.PRODUCERS_VIEW]);

    expect(
      screen.getByText('Esta sección necesita conexión'),
    ).toBeInTheDocument();
  });

  it('keeps a field section usable without a connection', () => {
    offline();
    renderAt('/fincas', [PERMISSIONS.FARMS_VIEW]);

    expect(screen.getByText('Contenido')).toBeInTheDocument();
  });

  it('lets a route outside the registry through', () => {
    renderAt('/panel', []);

    expect(screen.getByText('Contenido')).toBeInTheDocument();
  });
});
