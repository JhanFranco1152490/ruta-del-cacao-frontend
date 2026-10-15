'use client';

import { Plus } from 'lucide-react';
import type { ComponentProps } from 'react';

import { EditorLink } from '@/components/editor-link';
import { PageHeader } from '@/components/page-header';
import { buttonVariants } from '@/components/ui/button';
import { useSession } from '@/hooks/use-session';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

import { PlotOverview } from './plot-overview';

// Sin finca en la dirección, el editor deja elegirla.
const REGISTER_PLOT_PATH = '/fincas/parcelas/nueva';

// El segundo paso del trabajo del productor: después de sus fincas, todas sus parcelas juntas,
// con su mapa, su caracterización y todo lo que se puede hacer con cada una.
export function PlotListScreen(
  props: Pick<
    ComponentProps<typeof PlotOverview>,
    'farmHref' | 'renderPlotDetails' | 'failedPlotIds'
  >,
) {
  const { data: user } = useSession();
  const ownProducer = !!user?.producer_id;
  const registerLink = hasPermission(user, PERMISSIONS.PLOTS_ADD) && (
    <EditorLink
      className={buttonVariants({ size: 'office' })}
      href={REGISTER_PLOT_PATH}
    >
      <Plus aria-hidden="true" className="size-5" /> Registrar parcela
    </EditorLink>
  );

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-8">
      <PageHeader
        compact
        eyebrow="Gestión de parcelas"
        title={ownProducer ? 'Mis parcelas' : 'Parcelas'}
        description={
          ownProducer
            ? 'Consulta, caracteriza y administra las parcelas de todas tus fincas.'
            : 'Consulta las parcelas de las fincas de los productores.'
        }
        actions={registerLink || undefined}
      />
      <PlotOverview {...props} emptyAction={registerLink || undefined} />
    </div>
  );
}
