# Ruta del Cacao — Frontend

Aplicación Next.js con formularios de autenticación conectados a Django.

## Desarrollo local

1. Instalar dependencias con `pnpm install`.
2. Copiar `.env.example` a `.env.local` si se necesita cambiar la URL del backend.
   El valor por defecto es `http://localhost:8000`.
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
`NEXT_PUBLIC_API_URL` se incorpora al compilar el frontend.

## Flujo de sesión

Antes de cada POST, el cliente obtiene `/api/auth/csrf` con cookies y envía el
`csrf_token` recibido como `X-CSRFToken`. Los tokens de acceso y renovación
permanecen en cookies HttpOnly administradas por Django.

El panel consulta `/api/auth/me`; ante un 401 intenta renovar la sesión una vez.
Las consultas simultáneas comparten la renovación dentro de la pestaña. El cierre
también renueva el acceso si es necesario. Los fallos de conexión permiten
reintentar y no se presentan como un cierre exitoso.

La recuperación envía el correo registrado y abre
`/restablecer-contrasena?token=…` desde el enlace que genera Django. La nueva
contraseña debe tener entre 8 y 50 caracteres; Django aplica las validaciones
adicionales y sus errores se muestran en el formulario.

En despliegue se requiere HTTPS y cookies Secure. Frontend y API deben estar
en un mismo sitio compatible con SameSite=Lax, como subdominios del mismo dominio.
Dominios independientes requieren evaluar las restricciones de cookies entre sitios.

## Verificación

```sh
pnpm test
pnpm lint
pnpm exec tsc --noEmit
pnpm build
```

Las pruebas del frontend simulan HTTP; no sustituyen la comprobación con Django
y PostgreSQL. Para comprobar el recorrido real: iniciar sesión con documento y
correo, recargar el panel, cerrar sesión, solicitar recuperación y utilizar el
enlace recibido. Verificar también credenciales incorrectas y desconexión del
backend. Usar únicamente cuentas de prueba.
