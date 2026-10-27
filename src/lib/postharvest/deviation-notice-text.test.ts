import { describe, expect, it } from 'vitest';

import { buildDeviation } from '@/test/factories';

import { deviationLine, deviationNoticeText } from './deviation-notice-text';

describe('deviationLine', () => {
  it.each([
    [buildDeviation(), 'Sobresecado: 5,8 % (por debajo de 6,0 %)'],
    [
      buildDeviation({
        kind: 'drying_accelerated',
        severity: 'normal',
        value: '13',
        limit: '15.0',
      }),
      'Secado acelerado – riesgo de daño físico: 13,0 % (por debajo de 15,0 %)',
    ],
    [
      buildDeviation({
        kind: 'drying_slow_duration',
        severity: 'normal',
        value: '12.4',
        limit: '10.0',
      }),
      'Secado lento – riesgo de hongo: 12,4 % (por encima de 10,0 %)',
    ],
    [
      buildDeviation({
        kind: 'drying_slow_stalled',
        severity: 'normal',
        value: '2.1',
        limit: '4.0',
      }),
      'Secado lento – riesgo de hongo: bajó 2,1 puntos (menos de 4,0)',
    ],
    [
      buildDeviation({
        kind: 'drying_near_target',
        severity: 'normal',
        value: '8.1',
        limit: '7.6-8.5',
      }),
      'Próximo a meta – preparar ensacado: 8,1 % (entre 7,6 y 8,5 %)',
    ],
    [
      buildDeviation({
        kind: 'fermentation_temperature_low',
        severity: 'normal',
        value: '37.5',
        limit: '40.0',
      }),
      'Temperatura por debajo del rango: 37,5 °C (por debajo de 40,0 °C)',
    ],
    [
      buildDeviation({
        kind: 'fermentation_temperature_high',
        severity: 'normal',
        value: '53.0',
        limit: '50.0',
      }),
      'Temperatura por encima del rango: 53,0 °C (por encima de 50,0 °C)',
    ],
    [
      buildDeviation({
        kind: 'fermentation_ph_low',
        severity: 'normal',
        value: '3.9',
        limit: '4.00',
      }),
      'Grano demasiado ácido: pH 3,90 (por debajo de 4,00)',
    ],
    [
      buildDeviation({
        kind: 'fermentation_ph_high',
        severity: 'normal',
        value: '6.10',
        limit: '5.50',
      }),
      'La fermentación no avanza: pH 6,10 (por encima de 5,50)',
    ],
  ])('writes %o with its value and its limit', (alert, line) => {
    expect(deviationLine(alert)).toBe(line);
  });

  it('still says something about a kind this version does not know', () => {
    expect(
      deviationLine(buildDeviation({ kind: 'drying_new_rule', value: '9.0' })),
    ).toBe('Valor fuera de los parámetros: 9,0');
  });
});

describe('deviationNoticeText', () => {
  const subject = 'Bitácora del día 4 guardada';

  it('says nothing when the record has no deviations', () => {
    expect(deviationNoticeText([], subject)).toBeNull();
  });

  it('puts a single deviation in the title after the subject', () => {
    expect(deviationNoticeText([buildDeviation()], subject)).toEqual({
      title:
        'Bitácora del día 4 guardada · Sobresecado: 5,8 % (por debajo de 6,0 %)',
      description: undefined,
      critical: true,
    });
  });

  it('works with the lot in the subject, as when the queue sends it', () => {
    expect(
      deviationNoticeText(
        [buildDeviation()],
        'Bitácora de 000123-F02-P05-261014-1 (día 4)',
      )?.title,
    ).toBe(
      'Bitácora de 000123-F02-P05-261014-1 (día 4) · Sobresecado: 5,8 % (por debajo de 6,0 %)',
    );
  });

  it('puts the critical one first and the rest one per line', () => {
    const notice = deviationNoticeText(
      [
        buildDeviation({
          kind: 'drying_accelerated',
          severity: 'normal',
          value: '5.8',
          limit: '15.0',
        }),
        buildDeviation(),
      ],
      subject,
    );

    expect(notice).toEqual({
      title:
        'Bitácora del día 4 guardada · Sobresecado: 5,8 % (por debajo de 6,0 %)',
      description:
        'Secado acelerado – riesgo de daño físico: 5,8 % (por debajo de 15,0 %)',
      critical: true,
    });
  });

  it('keeps the order of the server when none is critical', () => {
    const notice = deviationNoticeText(
      [
        buildDeviation({
          kind: 'fermentation_temperature_high',
          severity: 'normal',
          value: '53.0',
          limit: '50.0',
        }),
        buildDeviation({
          kind: 'fermentation_ph_low',
          severity: 'normal',
          value: '3.90',
          limit: '4.00',
        }),
        buildDeviation({
          kind: 'fermentation_ph_high',
          severity: 'normal',
          value: '6.10',
          limit: '5.50',
        }),
      ],
      'Volteo 3 guardado',
    );

    expect(notice).toEqual({
      title:
        'Volteo 3 guardado · Temperatura por encima del rango: 53,0 °C (por encima de 50,0 °C)',
      description:
        'Grano demasiado ácido: pH 3,90 (por debajo de 4,00)\nLa fermentación no avanza: pH 6,10 (por encima de 5,50)',
      critical: false,
    });
  });
});
