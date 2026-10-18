import { createParser } from 'nuqs';

import { isIsoDate } from '@/lib/format/dates';

// Una fecha mal escrita en la URL (?semana=zzz, ?dia=2026-02-30) se descarta y cae al valor que
// la pantalla tenga por defecto.
export const parseAsIsoDate = createParser({
  parse: (value) => (isIsoDate(value) ? value : null),
  serialize: (value: string) => value,
});
