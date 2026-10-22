# Accesibilidad

La referencia de diseño es [WCAG 2.2 AA del W3C](https://www.w3.org/TR/WCAG22/). Esta guía define criterios para desarrollar y comprobar la interfaz. Un análisis automático sin errores no acredita por sí solo todos los criterios de accesibilidad.

## Controles y mensajes

Utiliza botones, enlaces, campos y selects nativos. Los controles con iconos necesitan un nombre accesible; un placeholder no sustituye una etiqueta. Asocia los errores y las pistas al campo correspondiente, y describe cómo corregir una entrada inválida.

Cada acción del tablero debe poder completarse con teclado. Ofrece selección de pieza y destino como alternativa a arrastrar. Comprueba también las decisiones especiales: comodines, promociones, tratos, subastas, editor de rummy y colocación naval. El orden del foco debe seguir el recorrido visual y conservar visibles las acciones necesarias para decidir.

No comuniques turno, resultado o error únicamente mediante color, posición o animación. Conserva texto, formas o símbolos que distingan jugadores y estados. Los avisos accesibles deben informar sin repetir innecesariamente cada cambio del reloj.

## Diálogos y foco

Usa `ui/Modal.tsx` para las superposiciones. El diálogo necesita título asociado, foco inicial, navegación contenida con Tab y Shift+Tab, Escape cuando la acción lo permita y restauración del foco al cerrar. El fondo y los diálogos inferiores son `inert`; solo la capa superior recibe interacción.

El foco visible común usa un contorno de 3 px con separación de 4 px. Reutiliza `--focus` en superficies claras y `--focus-on-dark` sobre la barra lateral. Comprueba que ningún panel o aviso tape el elemento enfocado.

Los errores de carga de un tablero y de protocolo necesitan una explicación y una acción explícita de recuperación. Conserva la sesión y permite que la persona elija cuándo recargar.

## Reflujo, tamaño y contraste

Prueba catálogo, sala y tableros a 320, 375, 390, 768 y 1280 px. Usa apodos largos, códigos anchos como `WWWWWW` y ambos idiomas. La página completa no debe desbordar horizontalmente; una superficie bidimensional puede desplazarse dentro de su propio contenedor si sus controles y textos siguen disponibles.

Comprueba zoom nativo al 200 % y al 400 %, cambios de orientación, teclado virtual y escalado del sistema. Reducir el viewport no sustituye probar zoom real. En Ciudad Fortuna verifica tablero completo, inspección de casillas mediante teclado, gestión económica en diálogo y acciones accesibles al desplazarse en móvil. No hay zoom específico del juego.

Los controles comunes usan una altura de 44 px. En tableros densos, evalúa también el tamaño y la separación de objetivos conforme al criterio 2.5.8; un valor general en CSS no garantiza cada casilla. Revisa contraste de texto, foco, bordes y estados seleccionados, desactivados o de carga en su contexto real.

## Movimiento

Respeta `prefers-reduced-motion`. `useBoardMotion` debe cancelar animaciones al cambiar la revisión, desmontar el tablero o activar movimiento reducido. Cargar o reconectar una partida no debe reproducir acciones antiguas. Mantén la información del estado disponible aunque no se anime.

## Comprobar una interfaz

1. Recorre con Tab, Shift+Tab y Enter el catálogo, formularios, sala, partida, diálogos y resultado. Comprueba todas las acciones especiales del juego.
2. Con VoiceOver u otro lector de pantalla, revisa nombres, roles, mensajes, orden de lectura, foco y ausencia de información privada ajena.
3. Prueba zoom, movimiento reducido, alto contraste, nombres largos y las dos traducciones en las fases relevantes.
4. Verifica en dispositivos físicos la orientación, el teclado virtual, el desplazamiento interno y la precisión de los objetivos táctiles.
5. Ejecuta las pruebas de navegador y los análisis axe descritos en [TESTING.md](TESTING.md). Las capturas y trazas de `tests/.output/` ayudan a inspeccionar fallos, pero no sustituyen el recorrido manual.

Si una barrera exige cambiar tiempos o interacciones, diseña la solución junto con las políticas autoritativas y las variantes del juego. La interfaz debe facilitar la acción sin alterar silenciosamente sus reglas.

La fila activa identifica el turno con texto, fondo y borde. El título permanece centrado con herramientas laterales de distinto tamaño. Los errores y reconexiones pueden consultarse completos sin una franja vacía. Al terminar los cinco minutos de autoplay, el anfitrión recibe un diálogo que exige una decisión explícita entre mantener la plaza automatizada o retirar al jugador. Revisa manualmente su foco, anuncio y uso con tecnologías de apoyo.

En las comprobaciones locales WebKit consume Escape al salir de pantalla completa nativa antes de enviarlo a la web. El diálogo conserva el foco y se puede cerrar con un segundo Escape o su botón. En la alternativa CSS, Escape cierra primero el diálogo. Esta diferencia depende del navegador y debe comprobarse también con dispositivos reales.

Safari en macOS puede omitir botones al usar Tab según la preferencia nativa de navegación. Opción+Tab incluye los controles nativos; la prueba de configuración utiliza esa combinación en WebKit y verifica foco, activación y restauración de valores. Los diálogos mantienen su recorrido propio con Tab y Shift+Tab, independiente de esa preferencia.
