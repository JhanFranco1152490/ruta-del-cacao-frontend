# Paquete de UI · Ruta del Cacao (dirección «Selva Viva»)

Referencia visual y tokens para construir pantallas. Fuente de verdad: `docs/ui/design-system.md`.
Tokens en `src/app/globals.css`. Pantallas de referencia (HTML estático, abrir en el navegador,
no copiar a `src/`) en `docs/ui/ref/`.

## Puesta en marcha

Hecho: las fuentes están instaladas en `src/app/layout.tsx`, shadcn/ui está inicializado
(`components.json`), `tw-animate-css` está importado en `globals.css` y `button` y `badge` ya
tienen las variantes de oficina. Lo que sigue pendiente son las variantes de campo (paso 4), que
se agregan con la primera pantalla de captura en campo. Los pasos de abajo quedan como
referencia de cómo se montó y de cómo agregar componentes base nuevos.

1. Instalar las fuentes con `next/font` en `src/app/layout.tsx`:

```tsx
import { DM_Serif_Display, Karla } from "next/font/google";

const serif = DM_Serif_Display({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-serif",
});
const sans = Karla({
  subsets: ["latin"],
  weight: ["400", "500", "700", "800"],
  variable: "--font-sans",
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${serif.variable} ${sans.variable}`}>
      <body>{children}</body>
    </html>
  );
}
```

2. Inicializar shadcn/ui y agregar los componentes base:

```bash
npx shadcn@latest init
npx shadcn@latest add button input label badge table card tabs checkbox switch select radio-group progress dialog dropdown-menu tooltip sonner skeleton pagination
```

3. Importar `@import "tw-animate-css";` en `globals.css` (el paso anterior lo instala).
4. Agregar las variantes propias a `button` (`copper`, tamaño `field`) y a `badge`
   (`ok | warn | err | info` hecho; faltan las versiones `-solid` y las de campo), según
   `design-system.md`.

## Cómo pedirle pantallas a Claude Code

Un prompt que funciona nombra la especificación, la referencia y las restricciones del dominio:

```
Implementa la pantalla de registro de finca (Sprint 1).
Sigue docs/ui/design-system.md y usa como referencia visual docs/ui/ref/s1-07-finca-mapa.html.
Reglas que no se negocian: controles de 44 px en escritorio, estados con ícono + texto,
foco visible, labels asociados.
El mapa va en un componente MapPanel aislado, con el proveedor detrás de una interfaz,
porque todavía no decidimos entre Leaflet y Google Maps.
No inventes datos: usa estados vacíos y de carga.
```

Para pantallas de campo, añade siempre:

```
Es una pantalla de captura en campo: mobile-first, controles de 60 px o más, botón principal de
ancho completo, bordes de 2.5 px, estados sólidos, y debe funcionar sin conexión guardando en
IndexedDB con cola de sincronización, una vez que el enfoque de Offline First esté aprobado
(no se construyen pantallas de campo antes; ver «Específico de este repo» en `AGENTS.md`).
```

Y cuando toques la parte visual del sistema:

```
Si necesitas un color, tamaño o radio que no exista en src/app/globals.css, agrégalo como token ahí
y documéntalo en docs/ui/design-system.md en el mismo cambio. No pongas valores sueltos en el JSX.
```

## Lo que falta decidir

- **Proveedor de mapas.** El diseño usa controles propios para no atarse: Leaflet con
  OpenStreetMap (gratis, con caché de teselas para el modo sin conexión) o Google Maps (mejor
  satelital, necesita llave y facturación). Deja el proveedor detrás de una interfaz.
- **Contenido real.** Todo lo que aparece entre `[CORCHETES]` en las referencias: nombres de la
  asociación y de productores, fotos de fincas, autorizaciones de publicación en el QR.
- **Datos de ejemplo.** Lotes, fincas y cifras de las referencias son inventados para poder
  dibujar. No sirven como fixtures.
