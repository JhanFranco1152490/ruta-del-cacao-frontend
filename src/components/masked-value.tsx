import { maskValue } from '@/lib/format/mask';

export function MaskedValue({
  value,
  prefix,
}: {
  value: string;
  prefix?: string;
}) {
  return (
    <span>
      {prefix && `${prefix} `}
      {maskValue(value)}
    </span>
  );
}
