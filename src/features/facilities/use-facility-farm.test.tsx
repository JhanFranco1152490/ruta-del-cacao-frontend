import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import {
  NuqsTestingAdapter,
  type OnUrlUpdateFunction,
} from 'nuqs/adapters/testing';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { buildFarm } from '@/test/factories';
import { farmsHandler } from '@/test/handlers';
import { createTestQueryClient } from '@/test/render';
import { server } from '@/test/server';

import { readLastFarm, rememberLastFarm } from './last-farm';
import { useFacilityFarm } from './use-facility-farm';

afterEach(() => window.localStorage.clear());

const newUser = () => `facility-farm-${crypto.randomUUID()}`;

const esperanza = buildFarm({ id: 'f1', code: 'F01', name: 'La Esperanza' });
const diviso = buildFarm({ id: 'f2', code: 'F02', name: 'El Diviso' });
const retired = buildFarm({
  id: 'f3',
  code: 'F03',
  name: 'La Vieja',
  is_active: false,
});

function setup({
  userId = newUser(),
  superuser = false,
  searchParams = '',
  elementFarm = null as string | null,
} = {}) {
  const onUrlUpdate = vi.fn<OnUrlUpdateFunction>();
  const queryClient = createTestQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <NuqsTestingAdapter
        searchParams={searchParams}
        onUrlUpdate={onUrlUpdate}
        hasMemory
      >
        {children}
      </NuqsTestingAdapter>
    </QueryClientProvider>
  );
  return {
    userId,
    onUrlUpdate,
    ...renderHook(() => useFacilityFarm(userId, superuser, elementFarm), {
      wrapper,
    }),
  };
}

describe('useFacilityFarm', () => {
  it('offers only the active farms and asks the first time', async () => {
    server.use(farmsHandler([esperanza, diviso, retired]));

    const { result } = setup();

    await waitFor(() =>
      expect(result.current.resolution).toEqual({ kind: 'choose' }),
    );
    expect(result.current.farms.map(({ id }) => id)).toEqual(['f1', 'f2']);
    expect(result.current.canSwitchFarm).toBe(true);
  });

  it('enters the remembered farm directly', async () => {
    server.use(farmsHandler([esperanza, diviso]));
    const userId = newUser();
    rememberLastFarm(userId, 'f2');

    const { result } = setup({ userId });

    await waitFor(() =>
      expect(result.current.resolution).toEqual({ kind: 'farm', farmId: 'f2' }),
    );
    expect(result.current.farm?.name).toBe('El Diviso');
  });

  it('asks again when the remembered farm is no longer active', async () => {
    server.use(farmsHandler([esperanza, diviso, retired]));
    const userId = newUser();
    rememberLastFarm(userId, 'f3');

    const { result } = setup({ userId });

    await waitFor(() =>
      expect(result.current.resolution).toEqual({ kind: 'choose' }),
    );
  });

  it('remembers the farm chosen and opens it in the URL', async () => {
    server.use(farmsHandler([esperanza, diviso]));
    const { result, userId, onUrlUpdate } = setup({
      searchParams: '?elegir=1&tipo=solar_dryer',
    });
    await waitFor(() =>
      expect(result.current.resolution).toEqual({ kind: 'choose' }),
    );

    await act(() => result.current.choose('f2'));

    expect(readLastFarm(userId)).toBe('f2');
    expect(onUrlUpdate.mock.lastCall?.[0].queryString).toBe(
      '?tipo=solar_dryer&finca=f2',
    );
  });

  it('opens the farm of the facility in the URL over any other', async () => {
    server.use(farmsHandler([esperanza, diviso]));
    const userId = newUser();
    rememberLastFarm(userId, 'f1');

    const { result } = setup({
      userId,
      searchParams: '?finca=f1',
      elementFarm: 'f2',
    });

    await waitFor(() =>
      expect(result.current.resolution).toEqual({ kind: 'farm', farmId: 'f2' }),
    );
  });

  it('never asks whoever has a single farm', async () => {
    server.use(farmsHandler([esperanza]));

    const { result } = setup({ searchParams: '?elegir=1' });

    await waitFor(() =>
      expect(result.current.resolution).toEqual({ kind: 'farm', farmId: 'f1' }),
    );
    expect(result.current.canSwitchFarm).toBe(false);
  });

  it('says there are no active farms', async () => {
    server.use(farmsHandler([retired]));

    const { result } = setup();

    await waitFor(() =>
      expect(result.current.resolution).toEqual({ kind: 'no-farms' }),
    );
  });

  it('asks the technical account for a producer before anything else', () => {
    const requests: URLSearchParams[] = [];
    server.use(farmsHandler([esperanza], requests));

    const { result } = setup({ superuser: true });

    expect(result.current.resolution).toEqual({ kind: 'producer' });
    expect(requests).toEqual([]);
  });

  it('offers the technical account the farms of the chosen producer', async () => {
    const requests: URLSearchParams[] = [];
    server.use(farmsHandler([esperanza, diviso], requests));

    const { result } = setup({
      superuser: true,
      searchParams: '?productor=p7',
    });

    await waitFor(() =>
      expect(result.current.resolution).toEqual({ kind: 'choose' }),
    );
    expect(requests[0].get('producer')).toBe('p7');
    expect(result.current.producer).toBe('p7');
  });

  it('ignores the producer in the URL for other accounts', async () => {
    const requests: URLSearchParams[] = [];
    server.use(farmsHandler([esperanza, diviso], requests));

    const { result } = setup({ searchParams: '?productor=p7' });

    await waitFor(() =>
      expect(result.current.resolution).toEqual({ kind: 'choose' }),
    );
    expect(requests[0].get('producer')).toBeNull();
    expect(result.current.producer).toBeNull();
  });
});
