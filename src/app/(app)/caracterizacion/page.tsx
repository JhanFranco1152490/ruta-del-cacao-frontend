import { Suspense } from 'react';

import { CharacterizationWithPlots } from './characterization-with-plots';

// Los filtros viven en la URL y los lee el navegador: la página sigue siendo fija y abre sin
// conexión.
export default function CharacterizationPage() {
  return (
    <Suspense>
      <CharacterizationWithPlots />
    </Suspense>
  );
}
