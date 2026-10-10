import { Pencil } from 'lucide-react';
import Link from 'next/link';

import type { QueueView } from '@/components/sync-tray/queue-view';
import { buttonVariants } from '@/components/ui/button';
import type { QueueItem } from '@/lib/offline/db';

import { activityCompletionPath } from './activity-paths';
import { CompletionDiscardDialog } from './components/completion-discard-dialog';
import { COMPLETION_RESOURCE, queuedCompletionOf } from './completion-queue';
import { isCorrectableCompletionError } from './sync-adapter';

// Una realización que espera conexión no ofrece nada: todavía puede llegar bien. La que el
// servidor rechazó se descarta, y se corrige solo si corregirla sirve de algo.
function CompletionQueueActions({
  item,
  onNavigate,
}: {
  item: QueueItem;
  onNavigate: () => void;
}) {
  const completion = queuedCompletionOf(item);
  if (completion.status !== 'error') return null;

  return (
    <div className="flex flex-wrap gap-3">
      {isCorrectableCompletionError(completion.errorCode) && (
        <Link
          aria-label={`Corregir ${completion.label}`}
          className={buttonVariants({ variant: 'outline', className: 'h-11' })}
          href={activityCompletionPath(completion.activityId)}
          onClick={onNavigate}
        >
          <Pencil aria-hidden="true" className="size-4" /> Corregir
        </Link>
      )}
      <CompletionDiscardDialog
        activityId={completion.activityId}
        label={completion.label}
      />
    </div>
  );
}

// Las realizaciones en la bandeja, nombradas por su labor y su parcela.
export const completionQueueView: QueueView = {
  resource: COMPLETION_RESOURCE,
  kind: 'Realización',
  title: (item) => queuedCompletionOf(item).label,
  Actions: CompletionQueueActions,
};
