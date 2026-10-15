# Despliegue

La web y Socket.IO se sirven desde un único proceso en el puerto 3000. El servidor de juego y el túnel de Cloudflare son contenedores independientes: este repositorio solo administra la aplicación.

## Node

```sh
pnpm install --frozen-lockfile
pnpm build
NODE_ENV=production pnpm start
```

El servidor escucha en `127.0.0.1:3000` por defecto. Para mantenerlo activo, utiliza tu gestor de procesos o Docker. Las opciones están en `.env.example`; puedes copiarlas a `.env` si necesitas cambiarlas. El servidor lee el archivo de la raíz independientemente de dónde se ejecute y las variables de entorno existentes tienen prioridad. `.env` está excluido de Git.

## Docker

Con Docker arrancado:

```sh
docker compose -p sobremesa up -d --build game-server
```

El puerto del juego se publica solo en `127.0.0.1:3000`. El contenedor ejecuta Node sin privilegios, con sistema de archivos de solo lectura y límites de recursos. Antes de arrancar Compose por primera vez en el servidor, comprueba que exista la red externa que ya usa tu contenedor de Cloudflared (`docker network inspect cloudflare`). Si aún no existe, créala con `docker network create cloudflare`. La app se conecta a esa red y también a su red Compose; no inicia ni administra Cloudflared.

Comprueba la configuración sin arrancar contenedores:

```sh
docker compose -p sobremesa config --quiet
```

## Cloudflare Tunnel

Cloudflared se configura y ejecuta por separado en su propio contenedor; no hay token, servicio ni archivo de configuración de Cloudflared dentro del proyecto. Ambos contenedores comparten la red Docker externa `cloudflare`. En el panel del túnel, dirige `games.samuelciocan.com` a `http://game-server:3000`; `game-server` es el nombre del servicio resoluble dentro de esa red. El contenedor de Cloudflared debe seguir conectado a `cloudflare`, incluso después de recrearlo al actualizar su imagen. Mantén el token fuera del repositorio.

`TRUST_CLOUDFLARE=true` permite identificar la IP del visitante para los límites de conexión. Actívalo únicamente si el origen está aislado y las peticiones públicas llegan por Cloudflare Tunnel. No se confía en `X-Forwarded-For`.

La aplicación limita la creación a 10 salas por IP y 30 en total por minuto, además del máximo predeterminado de 500 salas y 2.000 conexiones activas. El contenedor tiene un límite de memoria de 1 GB y un núcleo de CPU. Las salas abandonadas se cierran después de seis horas sin actividad humana. Los límites de salas y conexiones se pueden ajustar en `.env` según la capacidad del equipo. Estos límites reducen el abuso de salas, pero no sustituyen la protección frente a tráfico volumétrico de Cloudflare; activa las protecciones y reglas de tráfico disponibles para tu dominio.

## Comprobación después de publicar

Visita `https://games.samuelciocan.com/health` y prueba una sala con dos dispositivos, preferiblemente desde redes distintas. Comprueba invitaciones, una jugada en cada dirección, recarga y reconexión. Las rutas `/socket.io/`, `/api/` y `/health` deben seguir llegando al servidor.

Las salas viven en memoria en una sola instancia. Reiniciar el proceso termina las partidas; varias réplicas necesitan una solución para compartir y coordinar su estado antes de poder atender las mismas salas. Mantén una sola instancia de Node para estas salas en memoria. Se admiten varias salas independientes, del mismo juego o de juegos distintos. El reloj continúa cuando alguien pierde conexión; la reserva predeterminada es de 300.000 ms y permite volver desde otra IP con el mismo secreto de pestaña. Un reinicio del servidor requiere una partida nueva.

## Privacidad y operación

La aplicación incluye `/privacy` en español e inglés, con los datos de responsable y contacto facilitados. Antes de publicar, comprueba los registros que actives en Cloudflare y en el equipo, la contratación del proveedor y cualquier tratamiento o transferencia de datos de tu configuración concreta. El aviso describe esta versión sin anuncios ni analítica; revísalo si añades monetización u otros servicios. Las decisiones y las fuentes de referencia están en [DECISIONS.md](DECISIONS.md).
