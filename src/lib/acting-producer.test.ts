import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  getActingProducer,
  readActingProducer,
  subscribeActingProducer,
  syncActingProducer,
  writeActingProducer,
} from './acting-producer';

const PRODUCER = '33333333-3333-4333-8333-333333333333';
const OTHER = '44444444-4444-4444-8444-444444444444';

beforeEach(() => {
  sessionStorage.clear();
  syncActingProducer(null);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('acting producer store', () => {
  it('remembers the choice of one account', () => {
    writeActingProducer('u1', PRODUCER);

    expect(readActingProducer('u1')).toBe(PRODUCER);
  });

  it('keeps each account apart', () => {
    writeActingProducer('u1', PRODUCER);

    expect(readActingProducer('u2')).toBeNull();
  });

  it('forgets the choice when it is cleared', () => {
    writeActingProducer('u1', PRODUCER);
    writeActingProducer('u1', null);

    expect(readActingProducer('u1')).toBeNull();
    expect(getActingProducer()).toBeNull();
  });

  it('ignores a stored value that is not a uuid', () => {
    sessionStorage.setItem('cacao:acting-producer:u1', 'no-es-un-uuid');

    expect(readActingProducer('u1')).toBeNull();
  });

  it('tells the listeners in the same tab when it changes', () => {
    const listener = vi.fn();
    const stop = subscribeActingProducer(listener);

    writeActingProducer('u1', PRODUCER);
    stop();
    writeActingProducer('u1', OTHER);

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('still answers when the browser blocks the storage', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });

    expect(() => writeActingProducer('u1', PRODUCER)).not.toThrow();
    expect(getActingProducer()).toBe(PRODUCER);
  });
});

describe('syncActingProducer', () => {
  it('picks the stored choice of a superuser', () => {
    sessionStorage.setItem('cacao:acting-producer:u1', PRODUCER);

    syncActingProducer({ id: 'u1', is_superuser: true });

    expect(getActingProducer()).toBe(PRODUCER);
  });

  it('ignores a stored choice for an account that is not a superuser', () => {
    sessionStorage.setItem('cacao:acting-producer:u1', PRODUCER);

    syncActingProducer({ id: 'u1', is_superuser: false });

    expect(getActingProducer()).toBeNull();
  });

  it('forgets everything when there is no session', () => {
    sessionStorage.setItem('cacao:acting-producer:u1', PRODUCER);
    syncActingProducer({ id: 'u1', is_superuser: true });

    syncActingProducer(null);

    expect(getActingProducer()).toBeNull();
  });
});
