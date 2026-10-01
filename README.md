# Ruta del Cacao — Frontend

Aplicación Next.js (App Router) del sistema de trazabilidad de la producción de cacao. Se
conecta al backend Django por HTTP: inicio y recuperación de sesión, panel y gestión de
productores. La estructura del código, la capa de API y las reglas de trabajo están en
`AGENTS.md`.

## Desarrollo local

La versión de pnpm está fijada en el campo `packageManager` de `package.json`, y Corepack
(incluido con Node) la instala sola. Una vez por máquina, activa el comando `pnpm`:

```bash
corepack enable
```

En Windows, si falla por permisos (Node instalado en `C:\Program Files`), usa una carpeta
de tu usuario que ya esté en el `PATH` (en PowerShell; la carpeta puede no existir aún):

```powershell
New-Item -ItemType Directory -Force "$env:APPDATA\npm"
corepack enable --install-directory "$env:APPDATA\npm"
```

Comprueba con `pnpm -v`: debe mostrar la versión de `packageManager`. Sin este paso, el
hook de pre-commit no encuentra `pnpm` y el commit falla.

1. Instalar dependencias con `pnpm install`.
2. Copiar `.env.example` a `.env.local` si se necesita cambiar la URL del backend
   (`NEXT_PUBLIC_API_URL`). En desarrollo y pruebas, si no está definida, se usa
   `http://localhost:8000`.
3. Configurar y levantar el backend con PostgreSQL y sus migraciones aplicadas.
   Para el frontend local, Django necesita estos valores en su `.env`:

   ```dotenv
   CORS_ALLOWED_ORIGINS=http://localhost:3000
   CSRF_TRUSTED_ORIGINS=http://localhost:3000
   FRONTEND_URL=http://localhost:3000
   AUTH_COOKIE_SECURE=False
   AUTH_COOKIE_SAMESITE=Lax
   ```

4. Ejecutar `pnpm dev` y abrir `http://localhost:3000`.
5. Ingresar con una cuenta de prueba creada en el backend. No hay registro público.

Usar `localhost` en ambos servidores; mezclarlo con `127.0.0.1` afecta el envío
de cookies. Si cambia el puerto del frontend, actualizar ambos orígenes y
`FRONTEND_URL` en Django. Reiniciar los servidores tras cambiar variables.

## Variables de entorno

| Variable              | Uso                                                                  |
| --------------------- | -------------------------------------------------------------------- |
| `NEXT_PUBLIC_API_URL` | URL base del backend (sin barra final). Se incrusta al compilar.     |

`NEXT_PUBLIC_API_URL` es **obligatoria en producción**: `pnpm build` falla si no está
definida, para no publicar una app que apunte a `localhost`. Para comprobar el build en
local: `NEXT_PUBLIC_API_URL=http://localhost:8000 pnpm build`.

## Comandos

| Comando              | Qué hace                                                                    |
| -------------------- | --------------------------------------------------------------------------- |
| `pnpm dev`           | Servidor de desarrollo en `http://localhost:3000`.                          |
| `pnpm build`         | Compila para producción (requiere `NEXT_PUBLIC_API_URL`).                   |
| `pnpm test`          | Corre todas las pruebas una vez (Vitest).                                   |
| `pnpm test:watch`    | Pruebas en modo interactivo.                                                |
| `pnpm test:coverage` | Pruebas con reporte de cobertura.                                           |
| `pnpm lint`          | ESLint.                                                                     |
| `pnpm typecheck`     | Regenera los tipos de rutas de Next.js y revisa los tipos con `tsc`.        |
| `pnpm gen:api`       | Regenera `src/lib/api/schema.d.ts` desde el esquema OpenAPI del backend.    |

### Regenerar los tipos de la API

Los tipos de la API no se escriben a mano: salen de `src/lib/api/schema.d.ts`, generado
con `pnpm gen:api`. El comando lee `http://localhost:8000/api/schema`, que el backend solo
sirve con `DEBUG=True`, así que hay que tenerlo en marcha en ese modo. El archivo generado
se commitea. Tras regenerarlo, `pnpm typecheck` muestra qué código hay que ajustar.

## Flujo de sesión

Los tokens de acceso y renovación permanecen en cookies HttpOnly administradas por Django;
el frontend nunca los guarda. Antes de cada petición que modifica datos, el cliente obtiene
`/api/auth/csrf` y envía el `csrf_token` recibido como `X-CSRFToken`.

Las pantallas protegidas consultan `/api/auth/me`. Ante un 401 en un endpoint que usa el
token de acceso, el cliente renueva la sesión una sola vez (las peticiones simultáneas
comparten la renovación dentro de la pestaña) y repite la petición. Si la renovación
falla, la persona vuelve al inicio de sesión. Un fallo de conexión al cerrar sesión no se
presenta como un cierre exitoso: la persona sigue en el panel y puede reintentar.

La recuperación envía el correo registrado y abre
`/restablecer-contrasena?uid=…&token=…` desde el enlace que genera Django (en desarrollo
se imprime en la consola del backend). La nueva contraseña debe tener entre 8 y 50
caracteres; Django aplica las validaciones adicionales y sus errores se muestran en el
formulario.

En despliegue se requiere HTTPS y cookies Secure. Frontend y API deben estar
en un mismo sitio compatible con SameSite=Lax, como subdominios del mismo dominio.
Dominios independientes requieren evaluar las restricciones de cookies entre sitios.

## Verificación

```sh
pnpm exec prettier --write . && pnpm exec prettier --check .
pnpm lint
pnpm typecheck
pnpm test
NEXT_PUBLIC_API_URL=http://localhost:8000 pnpm build
```

Las pruebas del frontend simulan HTTP con MSW; no sustituyen la comprobación con Django
y PostgreSQL. Para comprobar el recorrido real: iniciar sesión con documento y
correo, recargar el panel, cerrar sesión, solicitar recuperación y utilizar el
enlace recibido; en Productores, filtrar, paginar y recargar (los filtros viven en la
URL), crear, editar, desactivar y reactivar. Verificar también credenciales incorrectas y
desconexión del backend. Usar únicamente cuentas de prueba.
