import { describe, expect, it } from 'vitest';

import { describeQueuedRecord } from './queued-record-text';

describe('describeQueuedRecord', () => {
  it('says a record that left the queue is already on the server', () => {
    expect(describeQueuedRecord({ status: 'synced' }, true)).toBe(
      'ya quedó guardada en el servidor.',
    );
  });

  it('says it is being sent when there is a connection', () => {
    expect(describeQueuedRecord({ status: 'pending' }, true)).toBe(
      'quedó guardada en este dispositivo y se está enviando al servidor.',
    );
  });

  it('says it will be sent when the connection comes back', () => {
    expect(describeQueuedRecord({ status: 'pending' }, false)).toBe(
      'quedó guardada en este dispositivo y se enviará al servidor cuando haya conexión.',
    );
  });

  it('gives the reason the server rejected it, when there is one', () => {
    expect(
      describeQueuedRecord(
        { status: 'error', errorMessage: 'El nombre ya existe.' },
        true,
      ),
    ).toBe(
      'quedó en este dispositivo, pero el servidor no la aceptó: El nombre ya existe. Corrígela para reenviarla.',
    );
    expect(describeQueuedRecord({ status: 'error' }, true)).toBe(
      'quedó en este dispositivo, pero el servidor no la aceptó. Corrígela para reenviarla.',
    );
  });
});
