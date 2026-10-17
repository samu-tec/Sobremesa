# Despliegue

La web y Socket.IO se sirven desde un único proceso en el puerto 3000. Cloudflared se administra independientemente y no forma parte de este repositorio.

## Configuración

No se necesita un archivo `.env`. `.env.example` documenta los valores opcionales para Compose; Node no carga ese archivo automáticamente. `config.ts` contiene los valores predeterminados; las variables de entorno del proceso permiten cambiarlos cuando haga falta. Docker Compose acepta ajustes opcionales del entorno o de su mecanismo de interpolación. Si no se pasan, la aplicación usa sus valores predeterminados.

En Node, el servidor escucha en `127.0.0.1:3000` por defecto. La imagen Docker usa `0.0.0.0` dentro del contenedor para que Cloudflared pueda llegar a ella. `ALLOWED_ORIGINS` incluye `https://games.samuelciocan.com` y los orígenes locales de desarrollo. Si se define manualmente, debe conservarse el dominio público.

## Docker Compose

El servicio, contenedor e imagen se identifican como `sobremesa`. Compose publica el puerto solo en `127.0.0.1:3000`, mantiene el sistema de archivos de solo lectura, elimina capacidades, ejecuta Node sin privilegios y aplica límites de memoria, CPU y procesos.

El comando de Compose previsto para construir y arrancar el servicio es:

```sh
docker compose -p sobremesa up -d --build --wait
```

Requiere Docker y la red externa `cloudflare`, que ya existe en el servidor de producción. Compose solo la referencia: no la crea, no crea una red propia para Sobremesa y no administra Cloudflared. `docker compose config --quiet` valida la configuración sin arrancar contenedores.

## Cloudflare Tunnel e IP de visitantes

Cloudflared permanece en su propio contenedor, conectado a la red externa `cloudflare`. El destino del túnel para `games.samuelciocan.com` es `http://sobremesa:3000`.

La aplicación no usa `X-Forwarded-For` ni confía automáticamente en `CF-Connecting-IP`. En la red compartida, cualquier contenedor que pueda conectarse directamente a Sobremesa podría enviar una cabecera falsa. Por eso solo se acepta `CF-Connecting-IP` cuando la dirección TCP de origen coincide con una IP exacta configurada en `TRUSTED_CLOUDFLARE_IPS`. Se pueden indicar varias direcciones separadas por comas; Node valida cada una con `net.isIP`. La lista está vacía por defecto.

Cloudflare puede servir la web sin esa variable. Mientras la lista esté vacía, el servidor usa la dirección TCP que ve: desde Cloudflared, normalmente será la IP del contenedor del túnel. En ese caso los visitantes comparten los límites por IP. Para que los límites reflejen la IP de cada visitante, hace falta conocer y permitir la IP exacta del contenedor Cloudflared. No se debe permitir toda la subred `cloudflare` ni confiar en la cabecera por sí sola. Si esa IP cambia, la aplicación vuelve a ignorar la cabecera hasta que la lista se actualice.

Los límites predeterminados son 10 intentos de creación de sala por IP y minuto, 30 creaciones globales por minuto, 500 salas y 2.000 conexiones. También hay límites por conexión. Estas medidas no sustituyen las protecciones de tráfico de Cloudflare.

## Comprobaciones operativas

Las salas y partidas viven en memoria. Recrear o reiniciar el contenedor termina las partidas activas. No hay volúmenes de datos que deban sincronizarse.

Después de un despliegue, comprueba `/health`, una sala entre dos dispositivos, una jugada en cada dirección, la reconexión y las invitaciones. La ruta pública es `https://games.samuelciocan.com/health`.

La aplicación está pensada para una sola instancia, porque las salas se guardan en memoria. Varias réplicas requerirían compartir y coordinar ese estado antes de atender las mismas salas.

## Privacidad y operación

La ruta `/privacy` está disponible en español e inglés. Los registros de Cloudflare y del alojamiento dependen de su configuración y plazos. Si se añaden analítica, monetización u otros servicios, habrá que revisar el aviso y el tratamiento de datos.

La compilación genera los avisos de licencias del cliente en `/third-party-notices.txt`; el Dockerfile incluye el script que los genera. Revisa también los límites y dependencias operativas descritos en [REVIEW.md](REVIEW.md).
