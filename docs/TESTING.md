# Comprobar Sobremesa

## Desarrollo

Instala con `pnpm install` y arranca con `pnpm dev`. Abre `http://127.0.0.1:5173`.
Para probar la construcción local: `pnpm build && pnpm start`, en `http://127.0.0.1:3000`.

## Comprobación habitual

`pnpm check` comprueba formato, ESLint, tipos y construcción de los tres paquetes, contratos de motores, regresiones de alto riesgo, traducciones, cliente y seguridad del servidor con Socket.IO local. `pnpm check:quick` es un alias compatible. No ejecuta navegador ni Docker.

La batería conserva registro e inicialización de los treinta juegos, rechazo de acciones inválidas, aislamiento de partidas, privacidad, sesiones, permisos, `matchId`, límites y orígenes. Los relojes simulados cubren autoplay, recuperación, retirada y cancelación de tareas. Las partidas de bots representativas comprueban progreso y finalización; economía de Ciudad Fortuna, Rummy, pagos de Póker, reclamaciones de Mahjong y secretos conservan regresiones específicas. No pretende agotar todas las reglas ni todas sus combinaciones.

Ejecuta solo lo relacionado durante el trabajo:

- Texto o CSS: formato y comprobación del área afectada.
- Componentes: tipos y prueba relevante; navegador si cambia una interacción.
- Motor: `pnpm --filter sobremesa-logic exec node --import tsx --test test/<archivo>.test.ts`.
- Servidor: construye los paquetes afectados y ejecuta el caso de `tests/server.test.mjs` o `tests/integration.test.mjs` con `node --test --test-name-pattern='<nombre>' <archivo>`.
- Seguridad, sesiones o protocolo: `pnpm test:integration`, después de construir.
- Al terminar una tarea importante: `pnpm check` una vez. Repite únicamente si cambian partes relacionadas o hay un fallo sin resolver.

`pnpm test`, `pnpm test:i18n` y `pnpm test:client` permiten comprobar esas áreas por separado.

## Navegador opcional

`PLAYWRIGHT_BROWSER=chromium pnpm test:e2e` construye una vez y ejecuta dos recorridos: dos clientes juegan, recargan, terminan y cambian de juego; móvil comprueba preferencias, reglas, accesibilidad y desbordamiento. Por defecto utiliza Chrome instalado. También admite `webkit` y `firefox` si están instalados en Playwright. Solo permite localhost. No se abre cada juego en cada resolución: los registros estáticos y la compilación verifican la integración de los treinta tableros.

Usa estos recorridos cuando cambie una interacción compartida, conexión, navegación o diseño, o se pidan explícitamente. Las capturas y trazas se guardan solo al fallar, bajo `tests/.output/`.

## Docker local opcional

Con el daemon local activo, `pnpm test:docker` construye una imagen temporal y ejecuta `tests/docker-smoke.mjs`: salud, estáticos, cabeceras, WebSocket, dos personas, permisos, reconexión y bots. Comprueba usuario no root, filesystem de solo lectura, recursos y apagado; limpia exclusivamente sus propios recursos. No ejecuta Playwright ni Compose de producción. Si el puerto 13000 está ocupado, no detengas el servicio ajeno.

## Revisión manual y fallos

Cuando cambie un juego, comprueba su interacción específica, legibilidad, teclado y móvil; prueba dispositivos reales cuando sea posible. Los recorridos automáticos no sustituyen revisar arrastre, sonido, animaciones o reglas nuevas.

Si falla una verificación, consulta el error y reproduce solo ese caso. Distingue un defecto del producto de un fallo del test o del entorno. No omitas validaciones ni aumentes plazos por inercia. Si falta un navegador o Docker, informa de la comprobación pendiente. No accedas a producción para probar.
