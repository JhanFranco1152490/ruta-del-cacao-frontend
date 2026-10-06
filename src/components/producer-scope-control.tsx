import { SegmentedControl } from '@/components/segmented-control';
import type { ScopeView } from '@/hooks/use-producer-scope';

const OPTIONS = [
  { value: 'activo', label: 'Del productor activo' },
  { value: 'todos', label: 'Todos' },
] as const;

export function ProducerScopeControl({
  value,
  onChange,
}: {
  value: ScopeView;
  onChange: (value: ScopeView) => void;
}) {
  return (
    <SegmentedControl
      label="Alcance de la lista"
      options={OPTIONS}
      value={value}
      onChange={onChange}
    />
  );
}
