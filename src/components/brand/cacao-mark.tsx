export function CacaoMark({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 64" aria-hidden="true">
      <path
        d="M24 3c11 8 18 20 18 34 0 14-7 24-18 24S6 51 6 37C6 23 13 11 24 3Z"
        fill="currentColor"
      />
      <path
        d="M24 8v48M13 19c7 4 15 4 22 0M10 33c9 5 19 5 28 0M12 47c8 4 16 4 24 0"
        fill="none"
        stroke="var(--background)"
        strokeWidth="2"
        strokeLinecap="round"
        opacity=".75"
      />
      <path
        d="M24 4c-1-2 0-4 2-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
