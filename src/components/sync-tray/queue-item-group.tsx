import type { QueueItem } from '@/lib/offline/db';

import type { QueueView } from './queue-view';

// Un grupo de la bandeja ("Requieren revisión", "Pendientes de enviar"). Un recurso sin vista
// registrada aparece como "Registro", sin acciones, en vez de esconderse.
export function QueueItemGroup({
  title,
  items,
  views,
  onNavigate,
}: {
  title: string;
  items: readonly QueueItem[];
  views: readonly QueueView[];
  onNavigate: () => void;
}) {
  if (!items.length) return null;
  return (
    <section aria-label={title} className="space-y-3">
      <h3 className="font-bold text-selva">
        {title} ({items.length})
      </h3>
      <ul className="space-y-3">
        {items.map((item) => {
          const view = views.find((v) => v.resource === item.resource);
          return (
            <li
              key={item.id}
              className="space-y-2 rounded-md border border-border p-3"
            >
              <p>
                {view ? (
                  <>
                    <span className="text-muted-foreground">
                      {view.kind} ·{' '}
                    </span>
                    <span className="font-bold">{view.title(item)}</span>
                  </>
                ) : (
                  <span className="font-bold">Registro</span>
                )}
              </p>
              {item.status === 'error' && item.errorMessage && (
                <p className="text-sm font-bold text-err">
                  {item.errorMessage}
                </p>
              )}
              {view && <view.Actions item={item} onNavigate={onNavigate} />}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
