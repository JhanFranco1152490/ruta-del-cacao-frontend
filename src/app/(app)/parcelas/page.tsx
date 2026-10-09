import { Suspense } from 'react';

import { PlotsWithCharacterization } from './plots-with-characterization';

// Los filtros viven en la URL y los lee el navegador: la página sigue siendo fija y abre sin
// conexión.
export default function PlotsPage() {
  return (
    <Suspense>
      <PlotsWithCharacterization />
    </Suspense>
  );
}
