# Revisión de Ciudad Fortuna y Sobremesa

Revisión técnica finalizada el 17 de octubre de 2026. Cambios locales: no se ha desplegado el sitio público ni modificado Cloudflare.

## Tablero e interacción

- Casillas rectangulares con nombres horizontales y una franja independiente para las fichas. Los seis asientos tienen posiciones estables y símbolos distintos; no cubren nombres ni precios.
- Colores de grupos en el borde exterior, propietario en el interior y edificios sobre la banda de grupo. Nombres completos y participantes disponibles en el nombre accesible y al consultar la casilla.
- En pantallas pequeñas, apertura en vista ampliada con desplazamiento y opción de ver el tablero completo. Jugadores y controles quedan fuera del tablero. Al terminar un movimiento, la vista ampliada centra la casilla activa.
- El servidor publica la ruta de cada tirada, incluidos el paso por Salida, las cartas y los traslados directos a prisión. Las fichas recorren esa ruta y los dados se animan también durante los turnos ajenos. Reconectar no reproduce movimientos antiguos; movimiento reducido y pestañas ocultas omiten la animación.
- Los estilos del juego se cargan con su componente. La geometría, fichas, superficie, animación y cálculo de alquiler tienen módulos propios. Se han retirado las capas contradictorias del CSS general.

La referencia pública consultada fue [Richup](https://richup.io/) y su [blog](https://blog.richup.io/). Se conserva el estilo salvia, crema y verde de Sobremesa. No se han incorporado código, imágenes, sonidos ni recursos de Richup. La revisión no certifica paridad con todas sus funciones.

## Reglas y correcciones

Se mantienen las variantes ya documentadas: banco de edificios ilimitado, bienes de bancarrota devueltos al banco, subastas abiertas de quince segundos e hipotecas conservadas en intercambios. No se presenta como una implementación del reglamento oficial de una marca.

El cálculo de alquiler es compartido entre el motor y el inspector: grupos, edificios, estaciones, servicios, hipotecas y alquiler desde prisión. Los índices de acciones requieren números enteros, sin conversiones implícitas. Un trato pendiente se cancela si deja de ser válido o cambia la hipoteca de un bien incluido. Los bots comparan valor económico y grupos completos, en lugar de contar propiedades. El historial del motor queda limitado a ochenta eventos.

## Seguridad y privacidad

Se revisaron autenticación de invitados, autorización por socket, validación de mensajes, opciones, estados privados, límites de conexiones y salas, gestión de IP de proxy, caducidad, cabeceras y aislamiento del contenedor. Se mantienen los secretos de sesión fuera del estado público y las reglas en el servidor.

Se añade `Cache-Control: no-store` al transporte Socket.IO, `Referrer-Policy: no-referrer` para evitar enviar enlaces de invitación como referencia y `Cross-Origin-Resource-Policy: same-origin` a los recursos HTTP. `.env.example` documenta los ajustes opcionales sin incluir credenciales.

`pnpm audit --prod --json` y `pnpm audit --json` devolvieron cero vulnerabilidades conocidas en las versiones instaladas durante esta revisión. Esto no demuestra ausencia de vulnerabilidades desconocidas ni sustituye futuras actualizaciones.

Las licencias y textos de copyright de las dependencias del cliente y del motor de reglas se generan desde los archivos instalados al compilar y se publican en `/third-party-notices.txt`, enlazado desde privacidad. El build falla si no encuentra el texto de licencia de una dependencia. El código propio no se relicencia mediante este proceso.

## Aspectos que dependen del responsable y del despliegue

El código no permite garantizar cumplimiento legal universal. El responsable debe verificar los datos de contacto publicados, el proveedor real de alojamiento, los contratos de tratamiento, los plazos de registros y las transferencias internacionales de su configuración efectiva. La procedencia y derechos sobre los materiales anteriores a esta revisión tampoco quedan certificados por cambiar el nombre del juego.

No se han añadido analítica, publicidad, pagos, apuestas ni recursos remotos al juego. Si cambia el tratamiento o se incorporan herramientas de seguimiento, deben revisarse la información al usuario y el consentimiento que resulte aplicable. No se añade un banner de aceptación indiscriminada para preferencias funcionales.

Fuentes oficiales para esta evaluación: [Comisión Europea: protección de datos desde el diseño](https://commission.europa.eu/law/law-topic/data-protection/information-business-and-organisations/principles-gdpr_en), [AEPD: guía de cookies](https://www.aepd.es/guias/guia-cookies.pdf), [RGPD](https://eur-lex.europa.eu/legal-content/ES/TXT/?uri=CELEX%3A32016R0679) y [OMPI: videojuegos y propiedad intelectual](https://www.wipo.int/en/web/copyright/activities/video_games).

## Validación reproducible

`pnpm check` ejecuta formato, compilación, motores, traducciones, integración y navegador. Las nuevas regresiones cubren rutas y prisión, aislamiento del estado público, índices malformados, cambios de hipotecas durante tratos, valoración de bots, alquileres, seis fichas en cada orientación, animaciones y vista móvil legible. Las capturas y trazas se generan en `tests/.output/`.

Las comprobaciones de navegador usan Chrome local con tamaños de escritorio y móvil; no equivalen a pruebas en dispositivos físicos, Safari o Firefox. No se ha certificado capacidad de carga ni se ha desplegado un contenedor en el servidor público.
