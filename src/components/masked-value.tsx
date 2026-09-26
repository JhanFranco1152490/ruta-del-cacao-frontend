import { maskValue } from '@/lib/mask';

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
