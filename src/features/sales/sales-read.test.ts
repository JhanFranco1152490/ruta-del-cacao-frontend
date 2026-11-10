import { describe, expect, it } from 'vitest';

import { buildSaleSummary } from '@/test/factories';

import type { SalePage, SaleSummary } from './api';
import { salesRead } from './sales-read';

const page = {
  count: 1,
  next: null,
  previous: null,
  results: [],
} as SalePage;

type Flags = {
  isPending: boolean;
  isPlaceholderData: boolean;
  fetchStatus: string;
  isError: boolean;
  error: unknown;
};

const read = <T>(
  data: T | undefined,
  flags: Partial<Flags> = {},
  savedAt?: number,
) => ({
  data: data === undefined ? undefined : { data, savedAt },
  isPending: false,
  isPlaceholderData: false,
  fetchStatus: 'idle',
  isError: false,
  error: null,
  ...flags,
});

const SUMMARY = buildSaleSummary() as SaleSummary;

describe('salesRead', () => {
  it('passes the list and the figures through when they were read', () => {
    const result = salesRead(read(page), read(SUMMARY), true);

    expect(result.page).toBe(page);
    expect(result.summary).toBe(SUMMARY);
    expect(result.loading).toBe(false);
    expect(result.neverLoaded).toBe(false);
  });

  it('keeps showing the previous month while the new one arrives with a connection', () => {
    const result = salesRead(
      read(page, { isPlaceholderData: true, fetchStatus: 'fetching' }),
      read(SUMMARY, { isPlaceholderData: true, fetchStatus: 'fetching' }),
      true,
    );

    expect(result.page).toBe(page);
    expect(result.summary).toBe(SUMMARY);
    expect(result.loading).toBe(false);
  });

  it('shows the saved copy of the month without a connection', () => {
    const result = salesRead(
      read(page, {}, 1_760_000_000_000),
      read(SUMMARY),
      false,
    );

    expect(result.page).toBe(page);
    expect(result.savedAt).toBe(1_760_000_000_000);
  });

  it('does not show the previous month without a connection, and waits for its copy', () => {
    const result = salesRead(
      read(page, { isPlaceholderData: true, fetchStatus: 'fetching' }),
      read(SUMMARY, { isPlaceholderData: true, fetchStatus: 'fetching' }),
      false,
    );

    expect(result.page).toBeUndefined();
    expect(result.savedAt).toBeUndefined();
    expect(result.summary).toBeUndefined();
    expect(result.loading).toBe(true);
    expect(result.neverLoaded).toBe(false);
  });

  it('asks for a connection once when the read stayed paused with nothing but the previous month', () => {
    const result = salesRead(
      read(page, { isPlaceholderData: true, fetchStatus: 'paused' }),
      read(SUMMARY, { isPlaceholderData: true, fetchStatus: 'paused' }),
      false,
    );

    expect(result.page).toBeUndefined();
    expect(result.loading).toBe(false);
    expect(result.neverLoaded).toBe(true);
  });

  it('asks for a connection once when it never loaded and failed without network', () => {
    const result = salesRead(
      read<SalePage>(undefined, {
        isError: true,
        error: new TypeError('Failed to fetch'),
      }),
      read(SUMMARY),
      false,
    );

    expect(result.neverLoaded).toBe(true);
  });
});
