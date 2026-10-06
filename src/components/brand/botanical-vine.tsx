// La línea botánica del inicio de sesión: una rama con hojas en trazo de oro, solo como ornamento
// sobre fondo oscuro (`--oro` no alcanza el contraste de texto sobre fondo claro).
export function BotanicalVine({ className = '' }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 300 200"
      preserveAspectRatio="xMidYMid slice"
      className={className}
    >
      <g fill="none" stroke="var(--oro)" strokeWidth="1.5">
        <path d="M-10 170 C60 150 120 120 200 60 S290 10 320 0" />
        <path d="M40 160 C50 130 80 120 100 126 C90 148 66 162 40 160Z M40 160 C60 144 78 134 98 127" />
        <path d="M120 118 C130 88 160 78 180 84 C170 106 146 120 120 118Z M120 118 C140 102 158 92 178 85" />
        <path d="M190 70 C200 40 230 30 250 36 C240 58 216 72 190 70Z M190 70 C210 54 228 44 248 37" />
        <path d="M250 32 C260 2 290 -8 310 -2 C300 20 276 34 250 32Z M250 32 C270 16 288 6 308 -1" />
      </g>
    </svg>
  );
}
