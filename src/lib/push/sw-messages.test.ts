import { describe, expect, it, vi } from 'vitest';

import {
  FALLBACK_URL,
  noticeUrl,
  openFromNotice,
  PUSH_ICON,
  pushNotice,
} from './sw-messages';

const ORIGIN = 'https://app.example.com';

describe('pushNotice', () => {
  it('shows what the server sent, replacing the earlier notice of the same activity', () => {
    expect(
      pushNotice({
        title: 'Tu actividad está vencida',
        body: 'Poda · P-01 · La Esperanza · 3 días de retraso',
        url: '/actividades?mes=2026-10&actividad=a1&notificacion=n1',
        tag: 'activity:a1',
      }),
    ).toEqual({
      title: 'Tu actividad está vencida',
      options: {
        body: 'Poda · P-01 · La Esperanza · 3 días de retraso',
        icon: PUSH_ICON,
        tag: 'activity:a1',
        renotify: true,
        data: { url: '/actividades?mes=2026-10&actividad=a1&notificacion=n1' },
      },
    });
  });

  it('shows a generic notice that opens the panel when the content is not readable', () => {
    for (const data of [null, 'texto', { body: 'sin título' }, 42]) {
      expect(pushNotice(data)).toEqual({
        title: 'Ruta del Cacao',
        options: {
          body: 'Tienes avisos nuevos',
          icon: PUSH_ICON,
          data: { url: FALLBACK_URL },
        },
      });
    }
  });

  it('never takes the person out of the app', () => {
    for (const url of [
      'https://otro.example.com/',
      '//otro.example.com/',
      'javascript:alert(1)',
      'actividades',
    ]) {
      expect(pushNotice({ title: 'Aviso', url }).options.data.url).toBe(
        FALLBACK_URL,
      );
    }
  });
});

describe('noticeUrl', () => {
  it('reads where the notice goes, and falls back to the panel', () => {
    expect(noticeUrl({ url: '/actividades?actividad=a1' })).toBe(
      '/actividades?actividad=a1',
    );
    expect(noticeUrl(undefined)).toBe(FALLBACK_URL);
    expect(noticeUrl({ url: 'https://otro.example.com/' })).toBe(FALLBACK_URL);
  });
});

describe('openFromNotice', () => {
  const windowClient = (url: string) => ({
    url,
    focus: vi.fn(async () => undefined),
    navigate: vi.fn(async () => undefined),
  });

  it('takes a window of the app that is already open to the link', async () => {
    const other = windowClient('https://otro.example.com/');
    const app = windowClient(`${ORIGIN}/fincas`);
    const openWindow = vi.fn();

    await openFromNotice({
      windows: [other, app],
      openWindow,
      origin: ORIGIN,
      url: '/actividades?actividad=a1',
    });

    expect(app.focus).toHaveBeenCalledOnce();
    expect(app.navigate).toHaveBeenCalledWith(
      `${ORIGIN}/actividades?actividad=a1`,
    );
    expect(other.focus).not.toHaveBeenCalled();
    expect(openWindow).not.toHaveBeenCalled();
  });

  it('opens the app when no window of it is open', async () => {
    const openWindow = vi.fn(async () => null);

    await openFromNotice({
      windows: [],
      openWindow,
      origin: ORIGIN,
      url: '/actividades?actividad=a1',
    });

    expect(openWindow).toHaveBeenCalledWith(
      `${ORIGIN}/actividades?actividad=a1`,
    );
  });

  it('opens a new one when the open window cannot be taken there', async () => {
    const app = windowClient(`${ORIGIN}/fincas`);
    app.navigate.mockRejectedValue(new TypeError('no controlada'));
    const openWindow = vi.fn(async () => null);

    await openFromNotice({
      windows: [app],
      openWindow,
      origin: ORIGIN,
      url: '/actividades',
    });

    expect(openWindow).toHaveBeenCalledWith(`${ORIGIN}/actividades`);
  });
});
