import { http, HttpResponse } from 'msw';

import { API_URL } from '@/lib/env';

export const apiUrl = (path: string) => `${API_URL}${path}`;

export const csrfHandler = http.get(apiUrl('/api/auth/csrf'), () =>
  HttpResponse.json({ csrf_token: 'test-csrf' }),
);

export const defaultHandlers = [csrfHandler];
