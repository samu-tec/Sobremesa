# Despliegue

Sobremesa se aloja en un servidor propio y se expone a Internet mediante Cloudflare Tunnel. La web y Socket.IO se sirven desde un único proceso en el puerto 3000. Cloudflared se administra independientemente y no forma parte de este repositorio.

## Configuración

No se necesita un archivo `.env`; Node no lo carga automáticamente. [config.ts](../apps/sobremesa-server/src/config.ts) contiene las variables opcionales, sus valores predeterminados y sus límites; las variables de entorno del proceso permiten cambiarlos cuando haga falta. Docker Compose acepta ajustes opcionales del entorno o de su mecanismo de interpolación. Si no se pasan, la aplicación usa sus valores predeterminados.

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

Para verificarlo manualmente en el entorno administrado, comprueba la IP de Cloudflared en la red compartida y la dirección TCP que recibe Node; un puente o NAT puede hacer que sean diferentes. Autoriza únicamente ese origen si está reservado al proxy y no puede ser utilizado por conexiones directas de clientes u otros contenedores. Comprueba también que el proxy sustituye la cabecera del visitante. Después verifica que dos visitantes distintos tienen contadores por IP independientes y que una conexión directa con una cabecera inventada no cambia su identidad. Estas comprobaciones dependen del entorno real y no se realizan desde las pruebas locales. No es seguro deducir automáticamente la IP autorizada ni permitir una subred completa.

Los límites predeterminados son 10 intentos de creación de sala por IP y minuto, 30 creaciones globales por minuto, 500 salas y 2.000 conexiones. También hay límites por conexión. Estas medidas no sustituyen las protecciones de tráfico de Cloudflare.

## Comprobaciones operativas

Las salas y partidas viven en memoria. Recrear o reiniciar el contenedor termina las partidas activas. No hay volúmenes de datos que deban sincronizarse.

Después de un despliegue, comprueba `/health`, una sala entre dos dispositivos, una jugada en cada dirección, la reconexión y las invitaciones. La ruta pública es `https://games.samuelciocan.com/health`.

La aplicación está pensada para una sola instancia, porque las salas se guardan en memoria. Varias réplicas requerirían compartir y coordinar ese estado antes de atender las mismas salas.

## Privacidad y operación

La ruta `/privacy` está disponible en español e inglés. La aplicación no genera registros de acceso ni conserva un historial. El registro de arranque y los errores genéricos no incluyen apodos, secretos o IPs de visitantes. No habilites registros de solicitudes, exportación de tráfico o analítica innecesarios. Cloudflared y los sistemas del servidor se administran fuera del repositorio: comprueba sus niveles de registro y retención, además de las condiciones y ajustes de Cloudflare. No supongas que desactivar registros en Node elimina el tratamiento de datos en la red de Cloudflare. Si se añaden analítica, monetización u otros servicios, habrá que revisar el aviso y el tratamiento de datos.

La compilación publica las condiciones del código propio en `/license.txt` y los avisos de dependencias en `/third-party-notices.txt`; el Dockerfile incluye el script que los genera. Consulta [ARCHITECTURE.md](ARCHITECTURE.md) para los límites del estado en memoria y las sesiones.

## Comprobación de producción sin desplegar

Usa `pnpm test:docker` para probar el Dockerfile real en Docker Desktop con puerto 13000 y recursos temporales aislados. No ejecutes este Compose de producción en el Mac ni crees una red llamada cloudflare para simularlo. [TESTING.md](TESTING.md) documenta alcance y limpieza.

`ALLOWED_ORIGINS` es opcional y acepta orígenes HTTP/HTTPS exactos, sin rutas, credenciales, barras finales ni comodines. De ellos se derivan las fuentes de conexión HTTP/WebSocket de CSP; no se usa Host ni se amplía confianza de proxies. Los valores predeterminados mantienen el dominio y desarrollo locales. Una actualización incompatible del contrato de red requiere incrementar PROTOCOL_VERSION; el cliente informa y ofrece recarga voluntaria conservando el secreto de pestaña.

Al reiniciar el proceso se pierden las salas: la recuperación de sesiones solo funciona mientras el estado siga disponible en memoria.
