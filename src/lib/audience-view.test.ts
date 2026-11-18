import { describe, expect, it } from 'vitest';

import { PERMISSIONS } from '@/lib/permissions';

import { availableViews, resolveView } from './audience-view';

const INDICATORS = {
  producer: PERMISSIONS.INDICATORS_VIEW_PRODUCER,
  association: PERMISSIONS.INDICATORS_VIEW_ASSOCIATION,
};
const PRODUCER = { permissions: [PERMISSIONS.INDICATORS_VIEW_PRODUCER] };
const ASSOCIATION = { permissions: [PERMISSIONS.INDICATORS_VIEW_ASSOCIATION] };
const BOTH = {
  permissions: [
    PERMISSIONS.INDICATORS_VIEW_PRODUCER,
    PERMISSIONS.INDICATORS_VIEW_ASSOCIATION,
  ],
};

describe('availableViews', () => {
  it('da a cada cuenta la vista de su permiso', () => {
    expect(availableViews(PRODUCER, INDICATORS)).toEqual(['producer']);
    expect(availableViews(ASSOCIATION, INDICATORS)).toEqual(['association']);
    expect(availableViews(BOTH, INDICATORS)).toEqual([
      'producer',
      'association',
    ]);
  });

  it('no da ninguna sin sesión o sin el permiso', () => {
    expect(availableViews(undefined, INDICATORS)).toEqual([]);
    expect(
      availableViews({ permissions: ['sales.view_sale'] }, INDICATORS),
    ).toEqual([]);
  });

  // Cada pantalla pasa sus permisos: los de los indicadores no abren los reportes.
  it('mira solo los permisos de la pantalla que pregunta', () => {
    expect(
      availableViews(BOTH, {
        producer: PERMISSIONS.REPORTS_VIEW_PRODUCER,
        association: PERMISSIONS.REPORTS_VIEW_ASSOCIATION,
      }),
    ).toEqual([]);
  });
});

describe('resolveView', () => {
  it('respeta la vista pedida si la cuenta la tiene', () => {
    expect(resolveView(['producer', 'association'], 'producer')).toBe(
      'producer',
    );
  });

  it('ignora una vista que la cuenta no tiene o una dirección mal escrita', () => {
    expect(resolveView(['producer'], 'association')).toBe('producer');
    expect(resolveView(['producer'], 'zzz')).toBe('producer');
  });

  it('abre la de la asociación cuando la cuenta tiene las dos y no pidió una', () => {
    expect(resolveView(['producer', 'association'], null)).toBe('association');
  });

  it('no abre ninguna sin permisos', () => {
    expect(resolveView([], 'producer')).toBeNull();
  });
});
