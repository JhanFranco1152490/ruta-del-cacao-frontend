'use client';

import { pageContainerClass } from '@/components/page-container';
import { PageHeader } from '@/components/page-header';
import { Pagination } from '@/components/pagination';
import { ProducerFilter } from '@/components/producer-filter';

import { changesCountLabel } from '../audit-filter-options';
import { AUDIT_PAGE_SIZE } from '../audit-request';
import { useAuditLogScreen } from '../use-audit-log-screen';
import { AuditFiltersBar } from './audit-filters-bar';
import { AuditLogStates } from './audit-log-states';
import { AuditTable } from './audit-table';

// La bitácora de cambios de la unidad productiva, de lo más reciente a lo más antiguo. Se lee en
// línea, sin copia en el dispositivo: el menú la abre solo con conexión.
export function AuditLogScreen() {
  const screen = useAuditLogScreen();
  const { filters } = screen;
  return (
    <div className={pageContainerClass('wide', 'space-y-5')}>
      <PageHeader
        accent="cobre"
        description="Qué se cambió en tu unidad productiva, quién lo hizo y cuándo."
        eyebrow="Seguimiento"
        title="Bitácora de cambios"
        tone="selva"
      />
      {screen.superuser && (
        <ProducerFilter
          className="w-full max-w-md"
          onClear={() => void filters.setProducer(null)}
          onSelect={(id) => void filters.setProducer(id)}
          producer={filters.values.producer ?? undefined}
          selected={screen.selectedProducer}
        />
      )}
      <section className="space-y-5 rounded-lg bg-card p-5 shadow-card">
        {screen.content !== 'needs-producer' && (
          <AuditFiltersBar screen={screen} />
        )}
        <AuditLogStates screen={screen}>
          {(page) => (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {changesCountLabel(page.count)}
              </p>
              <AuditTable entries={page.results} />
              <Pagination
                label="cambios"
                onPageChange={(next) => void filters.setPage(next)}
                page={filters.values.page}
                pageSize={AUDIT_PAGE_SIZE}
                total={page.count}
              />
            </div>
          )}
        </AuditLogStates>
      </section>
    </div>
  );
}
