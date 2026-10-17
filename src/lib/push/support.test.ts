import { describe, expect, it } from 'vitest';

import {
  deviceLabel,
  type PushEnvironment,
  pushSupport,
  vapidKeyBytes,
} from './support';

const ANDROID_CHROME =
  'Mozilla/5.0 (Linux; Android 14; SM-A145M) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36';
const IPHONE_SAFARI =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1';
const IPAD_AS_MAC =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15';
const WINDOWS_EDGE =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0';
const WINDOWS_FIREFOX =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:144.0) Gecko/20100101 Firefox/144.0';
const SAMSUNG =
  'Mozilla/5.0 (Linux; Android 14; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/27.0 Chrome/125.0.0.0 Mobile Safari/537.36';
const LINUX_CHROME =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';

const env = (overrides: Partial<PushEnvironment> = {}): PushEnvironment => ({
  userAgent: ANDROID_CHROME,
  maxTouchPoints: 5,
  standalone: false,
  serviceWorker: true,
  pushManager: true,
  notification: true,
  ...overrides,
});

describe('pushSupport', () => {
  it('is supported where the browser has a service worker, push and notices', () => {
    expect(pushSupport(env())).toBe('supported');
  });

  it('asks an iPhone to add the app to the home screen first', () => {
    expect(
      pushSupport(
        env({
          userAgent: IPHONE_SAFARI,
          pushManager: false,
          notification: false,
        }),
      ),
    ).toBe('ios-not-installed');
    // Un iPad se presenta como un Mac, pero con pantalla táctil.
    expect(
      pushSupport(env({ userAgent: IPAD_AS_MAC, pushManager: false })),
    ).toBe('ios-not-installed');
  });

  it('is supported on an iPhone with the app installed', () => {
    expect(
      pushSupport(env({ userAgent: IPHONE_SAFARI, standalone: true })),
    ).toBe('supported');
  });

  it('is not supported without any of the three', () => {
    expect(pushSupport(env({ serviceWorker: false }))).toBe('unsupported');
    expect(pushSupport(env({ pushManager: false }))).toBe('unsupported');
    expect(pushSupport(env({ notification: false }))).toBe('unsupported');
    // Un iPhone viejo instalado sin push tampoco.
    expect(
      pushSupport(
        env({ userAgent: IPHONE_SAFARI, standalone: true, pushManager: false }),
      ),
    ).toBe('unsupported');
  });

  it('does not take a Mac without a touch screen for an iPad', () => {
    expect(
      pushSupport(env({ userAgent: IPAD_AS_MAC, maxTouchPoints: 0 })),
    ).toBe('supported');
  });
});

describe('deviceLabel', () => {
  it('names the browser and the system', () => {
    expect(deviceLabel(ANDROID_CHROME, 5)).toBe('Chrome en Android');
    expect(deviceLabel(IPHONE_SAFARI, 5)).toBe('Safari en iPhone');
    expect(deviceLabel(IPAD_AS_MAC, 5)).toBe('Safari en iPad');
    expect(deviceLabel(IPAD_AS_MAC, 0)).toBe('Safari en Mac');
    expect(deviceLabel(WINDOWS_EDGE, 0)).toBe('Edge en Windows');
    expect(deviceLabel(WINDOWS_FIREFOX, 0)).toBe('Firefox en Windows');
    expect(deviceLabel(SAMSUNG, 5)).toBe('Samsung Internet en Android');
    expect(deviceLabel(LINUX_CHROME, 0)).toBe('Chrome en Linux');
  });

  it('says only what it can tell', () => {
    expect(deviceLabel('Raro/1.0', 0)).toBe('Navegador');
  });
});

describe('vapidKeyBytes', () => {
  it('turns the URL-safe base64 key into bytes', () => {
    // "AQID_w" es 01 02 03 FF sin relleno.
    expect([...vapidKeyBytes('AQID_w')]).toEqual([1, 2, 3, 255]);
  });
});
