import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { apiUrl } from '@/test/handlers';
import { server } from '@/test/server';

import {
  disablePush,
  enablePush,
  forgetPushSubscription,
  type PushBrowser,
  readPushState,
} from './subscription';
import type { PushEnvironment } from './support';

const ANDROID_CHROME =
  'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36';

const ENDPOINT = 'https://fcm.googleapis.com/fcm/send/abc';

const fakeSubscription = () => ({
  endpoint: ENDPOINT,
  toJSON: () => ({
    endpoint: ENDPOINT,
    keys: { p256dh: 'p256', auth: 'auth' },
  }),
  unsubscribe: vi.fn(async () => true),
});

// Un navegador simulado: el permiso que tiene, lo que responde al pedirlo y su suscripción.
function fakeBrowser({
  permission = 'default' as NotificationPermission,
  answer = 'granted' as NotificationPermission,
  subscribed = false,
  registered = true,
  environment = {} as Partial<PushEnvironment>,
} = {}) {
  let current = subscribed ? fakeSubscription() : null;
  let granted = permission;
  const pushManager = {
    getSubscription: vi.fn(async () => current),
    subscribe: vi.fn(async () => {
      current = fakeSubscription();
      return current;
    }),
  };
  const browser: PushBrowser = {
    environment: () => ({
      userAgent: ANDROID_CHROME,
      maxTouchPoints: 5,
      standalone: false,
      serviceWorker: true,
      pushManager: true,
      notification: true,
      ...environment,
    }),
    permission: () => granted,
    requestPermission: vi.fn(async () => {
      granted = answer;
      return answer;
    }),
    registration: async () =>
      registered
        ? ({ pushManager } as unknown as { pushManager: PushManager })
        : undefined,
  };
  return { browser, pushManager, current: () => current };
}

let sent: { path: string; body: unknown }[];

beforeEach(() => {
  sent = [];
  server.use(
    http.post(
      apiUrl('/api/notifications/push-subscriptions'),
      async ({ request }) => {
        sent.push({ path: 'subscribe', body: await request.json() });
        return HttpResponse.json(
          { id: 's1', device_label: 'Chrome en Android', created_at: '' },
          { status: 201 },
        );
      },
    ),
    http.post(
      apiUrl('/api/notifications/push-subscriptions/remove'),
      async ({ request }) => {
        sent.push({ path: 'remove', body: await request.json() });
        return new HttpResponse(null, { status: 204 });
      },
    ),
  );
});

describe('readPushState', () => {
  it('is to decide while nothing was asked', async () => {
    expect(await readPushState(fakeBrowser().browser)).toBe('prompt');
  });

  it('is active with the permission and a subscription', async () => {
    const { browser } = fakeBrowser({
      permission: 'granted',
      subscribed: true,
    });
    expect(await readPushState(browser)).toBe('active');
  });

  it('is blocked when the person refused it', async () => {
    const { browser } = fakeBrowser({ permission: 'denied' });
    expect(await readPushState(browser)).toBe('blocked');
  });

  it('is not supported without a service worker registered', async () => {
    const { browser } = fakeBrowser({ registered: false });
    expect(await readPushState(browser)).toBe('unsupported');
  });

  it('asks an iPhone to install the app', async () => {
    const { browser } = fakeBrowser({
      environment: {
        userAgent:
          'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1',
      },
    });
    expect(await readPushState(browser)).toBe('ios-not-installed');
  });
});

describe('enablePush', () => {
  it('asks for the permission, subscribes and sends it to the server', async () => {
    const { browser, pushManager } = fakeBrowser();

    expect(await enablePush('AQID_w', browser)).toBe('active');

    expect(browser.requestPermission).toHaveBeenCalledOnce();
    expect(pushManager.subscribe).toHaveBeenCalledWith({
      userVisibleOnly: true,
      applicationServerKey: new Uint8Array([1, 2, 3, 255]),
    });
    expect(sent).toEqual([
      {
        path: 'subscribe',
        body: {
          endpoint: ENDPOINT,
          keys: { p256dh: 'p256', auth: 'auth' },
          device_label: 'Chrome en Android',
        },
      },
    ]);
  });

  it('does not subscribe when the person refuses it', async () => {
    const { browser, pushManager } = fakeBrowser({ answer: 'denied' });

    expect(await enablePush('AQID_w', browser)).toBe('blocked');
    expect(pushManager.subscribe).not.toHaveBeenCalled();
    expect(sent).toEqual([]);
  });

  it('stays to decide when the person closes the question', async () => {
    const { browser } = fakeBrowser({ answer: 'default' });
    expect(await enablePush('AQID_w', browser)).toBe('prompt');
  });
});

describe('disablePush', () => {
  it('takes it out of the server and then out of the browser', async () => {
    const { browser, current } = fakeBrowser({
      permission: 'granted',
      subscribed: true,
    });
    const subscription = current()!;

    expect(await disablePush(browser)).toBe('prompt');

    expect(sent).toEqual([{ path: 'remove', body: { endpoint: ENDPOINT } }]);
    expect(subscription.unsubscribe).toHaveBeenCalledOnce();
  });

  it('keeps the browser subscribed if the server fails', async () => {
    server.use(
      http.post(apiUrl('/api/notifications/push-subscriptions/remove'), () =>
        HttpResponse.error(),
      ),
    );
    const { browser, current } = fakeBrowser({
      permission: 'granted',
      subscribed: true,
    });

    await expect(disablePush(browser)).rejects.toThrow();
    expect(current()!.unsubscribe).not.toHaveBeenCalled();
  });
});

describe('forgetPushSubscription', () => {
  it('takes it out of the server and the browser', async () => {
    const { browser, current } = fakeBrowser({
      permission: 'granted',
      subscribed: true,
    });
    const subscription = current()!;

    await forgetPushSubscription(browser);

    expect(sent).toEqual([{ path: 'remove', body: { endpoint: ENDPOINT } }]);
    expect(subscription.unsubscribe).toHaveBeenCalledOnce();
  });

  it('unsubscribes the browser even without a connection', async () => {
    server.use(
      http.post(apiUrl('/api/notifications/push-subscriptions/remove'), () =>
        HttpResponse.error(),
      ),
    );
    const { browser, current } = fakeBrowser({
      permission: 'granted',
      subscribed: true,
    });
    const subscription = current()!;

    await expect(forgetPushSubscription(browser)).resolves.toBeUndefined();
    expect(subscription.unsubscribe).toHaveBeenCalledOnce();
  });

  it('does nothing without a subscription', async () => {
    await forgetPushSubscription(fakeBrowser().browser);
    expect(sent).toEqual([]);
  });
});
