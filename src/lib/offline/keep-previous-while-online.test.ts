import { onlineManager } from '@tanstack/react-query';
import { afterEach, describe, expect, it } from 'vitest';

import { keepPreviousWhileOnline } from './keep-previous-while-online';

afterEach(() => onlineManager.setOnline(true));

describe('keepPreviousWhileOnline', () => {
  it('keeps the previous list while there is a network', () => {
    expect(keepPreviousWhileOnline({ results: [1] })).toEqual({ results: [1] });
  });

  it('keeps nothing without a network, so another period is never shown as this one', () => {
    onlineManager.setOnline(false);

    expect(keepPreviousWhileOnline({ results: [1] })).toBeUndefined();
  });

  it('has nothing to keep on the first read', () => {
    expect(keepPreviousWhileOnline(undefined)).toBeUndefined();
  });
});
