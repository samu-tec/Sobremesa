# Despliegue

La web y Socket.IO se sirven desde un único proceso en el puerto 3000. El destino previsto es `games.samuelciocan.com` mediante Cloudflare Tunnel.

## Node

```sh
pnpm install --frozen-lockfile
pnpm build
NODE_ENV=production pnpm start
```

El servidor escucha en `127.0.0.1:3000` por defecto. Para mantenerlo activo, utiliza tu gestor de procesos o la opción Docker.

Las opciones están en `.env.example`. Puedes copiarlas a `.env` si necesitas cambiarlas. El servidor lee el archivo de la raíz independientemente de dónde se ejecute; las variables de entorno existentes tienen prioridad. Las credenciales y `.env` están excluidos de Git.

## Docker

Con Docker arrancado:

```sh
docker compose up -d --build game-server
```

El puerto se publica solo en `127.0.0.1`. El contenedor ejecuta Node sin privilegios, con sistema de archivos de solo lectura y límites de recursos.

La configuración de Compose se puede comprobar sin arrancar contenedores:

```sh
docker compose config --quiet
```

## Cloudflare Tunnel

Si cloudflared se ejecuta en el mismo equipo que el servidor, configura una aplicación publicada en el túnel:

| Campo    | Valor                    |
| -------- | ------------------------ |
| Hostname | `games.samuelciocan.com` |
| Servicio | `http://127.0.0.1:3000`  |

Publica todo el servicio, incluido `/socket.io/`. Para un túnel administrado localmente hay una plantilla en [cloudflared.example.yml](../deploy/cloudflared.example.yml). Sustituye sus marcadores y guarda las credenciales fuera del repositorio.

Si prefieres ejecutar cloudflared con Docker, guarda `CLOUDFLARE_TUNNEL_TOKEN` en `.env` y configura el servicio del túnel como **`http://game-server:3000`**. Después:

```sh
docker compose --profile tunnel up -d --build
```

En ese caso `game-server` es el nombre del servicio en la red Docker; `localhost` dentro de cloudflared identifica su propio contenedor.

Configura `ALLOWED_ORIGINS=https://games.samuelciocan.com` para el servicio público. Conserva también los orígenes locales si necesitas visitarlos desde el navegador.

`TRUST_CLOUDFLARE=true` permite identificar la IP del visitante para los límites de conexión. Úsalo solo si el origen está aislado y las peticiones públicas llegan por tu cloudflared. Con la opción desactivada, las conexiones del túnel comparten el límite de su IP. No se confía en `X-Forwarded-For`.

Referencias: [publicar una aplicación con Cloudflare Tunnel](https://developers.cloudflare.com/tunnel/get-started/), [WebSockets](https://developers.cloudflare.com/network/websockets/) y [túneles administrados localmente](https://developers.cloudflare.com/tunnel/features/locally-managed-tunnels/create-local-tunnel/).

## Comprobación después de publicar

Visita `https://games.samuelciocan.com/health` y prueba una sala con dos dispositivos, preferiblemente desde redes distintas. Comprueba invitaciones, una jugada en cada dirección, recarga y reconexión. Las rutas `/socket.io/`, `/api/` y `/health` deben seguir llegando al servidor.

Las salas viven en memoria en una sola instancia. Reiniciar el proceso termina las partidas; varias réplicas necesitan una solución para compartir y coordinar su estado antes de poder atender las mismas salas.

## Privacidad y operación

La aplicación incluye `/privacy` en español e inglés, con el responsable y contacto facilitados. Antes de publicar comprueba los registros que actives en Cloudflare y en el equipo, la contratación del proveedor y cualquier tratamiento o transferencia de datos de tu configuración concreta. El aviso describe esta versión sin anuncios ni analítica; revísalo si añades monetización u otros servicios. Las decisiones y las fuentes de referencia están en [DECISIONS.md](DECISIONS.md).

Mantén una sola instancia de Node para estas salas en memoria. Se admiten varias salas independientes, tanto del mismo juego como de juegos distintos. El reloj continúa cuando alguien pierde conexión; la reserva predeterminada es de 180.000 ms y permite volver desde otra IP con el mismo secreto de pestaña. Un reinicio del servidor requiere una partida nueva.
