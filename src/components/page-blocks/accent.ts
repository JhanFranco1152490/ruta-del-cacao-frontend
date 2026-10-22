import type { CSSProperties } from 'react';

// El acento de cada módulo: un color de la paleta y su tinte claro. Lo leen los
// componentes de `page-blocks` por `--mod` y `--mod-tint`.
export type ModuleAccent = 'cobre' | 'hoja' | 'cacao';

const ACCENTS: Record<ModuleAccent, [string, string]> = {
  cobre: ['var(--cobre)', 'var(--cobre-tint)'],
  hoja: ['var(--hoja)', 'var(--hoja-tint)'],
  cacao: ['var(--morado-cacao)', 'var(--cacao-tint)'],
};

export const accentStyle = (accent: ModuleAccent) =>
  ({
    '--mod': ACCENTS[accent][0],
    '--mod-tint': ACCENTS[accent][1],
  }) as CSSProperties;
