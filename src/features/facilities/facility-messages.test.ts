import { describe, expect, it } from 'vitest';

import { ApiError } from '@/lib/api/errors';

import {
  activatedMessage,
  activateText,
  deactivatedMessage,
  deactivateText,
  facilityChangeErrorMessage,
  occupiedText,
} from './facility-messages';

const box = { facility_type: 'fermentation_box', name: 'C-01' } as const;
const dryer = { facility_type: 'solar_dryer', name: 'M-01' } as const;

const apiError = (status: number, code: string, extra = {}) =>
  new ApiError(status, {
    detail: 'Error de prueba.',
    code,
    fields: {},
    ...extra,
  });

describe('the notices of a status change', () => {
  it('names the facility and agrees with its type', () => {
    expect(activatedMessage(box)).toBe('Cajón C-01 activado');
    expect(activatedMessage(dryer)).toBe('Marquesina M-01 activada');
    expect(deactivatedMessage(box)).toBe('Cajón C-01 desactivado');
    expect(deactivatedMessage(dryer)).toBe('Marquesina M-01 desactivada');
  });
});

describe('the confirmation texts', () => {
  it('says what deactivating does, with the process of each type', () => {
    expect(deactivateText(box)).toBe(
      'Dejará de ofrecerse al iniciar fermentaciones. Las fermentaciones en las que se usó no cambian. Puedes activarlo de nuevo cuando quieras.',
    );
    expect(deactivateText(dryer)).toBe(
      'Dejará de ofrecerse al iniciar secados. Los secados en los que se usó no cambian. Puedes activarla de nuevo cuando quieras.',
    );
  });

  it('says what activating does', () => {
    expect(activateText(box)).toBe(
      'Quedará Disponible y se ofrecerá de nuevo al iniciar fermentaciones.',
    );
    expect(activateText(dryer)).toBe(
      'Quedará Disponible y se ofrecerá de nuevo al iniciar secados.',
    );
  });
});

describe('occupiedText', () => {
  it('says which lot occupies it and when the action will be possible', () => {
    expect(occupiedText('000123-F02-P05-261014-1', 'desactivar')).toBe(
      'No se puede desactivar: lo ocupa el lote 000123-F02-P05-261014-1. Se podrá desactivar cuando termine su proceso.',
    );
    expect(occupiedText('000123-F02-P05-261014-1', 'eliminar')).toBe(
      'No se puede eliminar: lo ocupa el lote 000123-F02-P05-261014-1. Se podrá eliminar cuando termine su proceso.',
    );
  });
});

describe('facilityChangeErrorMessage', () => {
  it('explains a stale version and a facility that no longer exists', () => {
    expect(
      facilityChangeErrorMessage(apiError(409, 'stale_version'), 'Falló.'),
    ).toBe(
      'Otra persona cambió este elemento mientras tanto. Cierra y vuelve a intentarlo con sus datos actuales.',
    );
    expect(
      facilityChangeErrorMessage(apiError(404, 'not_found'), 'Falló.'),
    ).toBe('Este elemento ya no existe.');
  });

  it('falls back to the message it receives without a response', () => {
    expect(
      facilityChangeErrorMessage(new TypeError('Failed to fetch'), 'Falló.'),
    ).toBe('Falló.');
  });
});
