# Sistema de diseño

Sobremesa usa salvia, crema, verdes oscuros, ilustraciones SVG y tipografía editorial para transmitir una mesa compartida. No hay framework de estilos.

## Archivos y cascada

`src/styles.css` es el único índice de estilos globales. Importa primero `styles/tokens.css`, después las diez secciones de la interfaz y finalmente `styles/boards.css`. Las secciones de la interfaz son: `foundation`, `shell`, `catalog`, `dialogs`, `rooms`, `game-layout`, `classic-boards`, `motion`, `responsive` y `refinements`. Cada archivo delimita controles básicos, navegación, catálogo, diálogos, salas o superficie de juego. El orden de importación conserva la cascada: los ajustes responsive y las reglas finales siguen después de las bases. `boards.css` contiene los tableros ampliados y Ciudad Fortuna mantiene su CSS cargado con el componente.

Reutiliza los tokens en superficies compartidas. Conserva el ámbito de las media queries y las alternativas sintácticas necesarias para los navegadores compatibles. No reordenes reglas solo porque comparten selector: podrían competir con variantes intermedias. Una ampliación debería integrarse en la sección correspondiente y evitar otra capa global de sobrescrituras.

Las ilustraciones SVG se agrupan como funciones locales en `src/ui/GameArtwork.tsx`, junto al contenedor, las paletas y el registro exhaustivo de los treinta juegos. Ajedrez y damas comparten la misma base. Cada ilustración recibe el identificador único del contenedor para referenciar sus filtros sin colisiones entre tarjetas; no necesita un archivo propio mientras siga siendo una pieza pequeña y exclusiva de este módulo.

## Tokens utilizados

| Propósito                         | Variable / valor                                                                                            |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Fondo / papel                     | `--background: #f7f8f4`, `--paper: #fffefa`                                                                 |
| Texto / secundario                | `--ink: #243b32`, `--muted: #626f5d`                                                                        |
| Principal / texto sobre principal | `--green: #2e654e`, `--text-on-primary: #fffdf4`                                                            |
| Acentos / borde                   | `--mint: #d8eddf`, `--coral: #d47d62`, `--line: #e2e7df`                                                    |
| Foco                              | `--focus: #9c4b17`, `--focus-on-dark: #f7dfad` para la barra lateral; contorno de 3 px y separación de 4 px |
| Error / éxito                     | `--error: #9b3528`, `--success: #2e654e`, siempre con texto                                                 |
| Espaciado                         | `--space-1/2/3/4/6/8`: 4, 8, 12, 16, 24 y 32 px                                                             |
| Texto / control                   | `--font-body: 16px`, `--font-control: 14px`; títulos editoriales Georgia                                    |
| Controles                         | `--control-height: 44px`, `--radius-control: 8px`                                                           |
| Diálogo                           | `--radius-dialog: 17px`, `--shadow-dialog`                                                                  |
| Transición / capas                | `--duration-fast: .18s`, `--layer-dialog: 80`, `--layer-notice: 70`                                         |

El texto base usa 16 px y los controles principales 14 px; las etiquetas y ayudas de los formularios revisados mantienen al menos 13 px. Los detalles geométricos de tableros pueden ser menores cuando tienen una alternativa legible, como el inspector de casillas de Ciudad Fortuna y las etiquetas de coordenadas de Batalla naval. Los tokens definen el vocabulario común de los componentes. Los estilos de fichas, casillas y tableros pueden tener valores específicos. Los avisos de partida tienen reglas de capa propias. No cambies en bloque todos los colores iguales: una casilla, una ficha y un estado semántico pueden necesitar evolucionar por separado.

El verde sobre crema y blanco sobre verde son combinaciones principales. El texto secundario usa `#626f5d`. El foco utiliza una variante oscura sobre superficies claras y una clara en la barra lateral. Acentos y bordes suaves no bastan para identificar controles por sí solos; conserva texto, forma y foco. La comprobación automática de contraste depende del contexto y no acredita todos los estados.

## Componentes y comportamiento

- `.button` y variantes `.primary`, `.secondary`, `.small`: acción, hover y disabled coherentes. `.icon-button` requiere nombre accesible. `busy` bloquea duplicados; no sustituye la autorización del servidor.
- `.field`, etiquetas y pistas: errores en lenguaje comprensible, enlazados al campo cuando corresponda. Mantén los selects nativos y no uses placeholder como única etiqueta.
- `Modal`: título asociado, foco inicial, Tab contenido, Escape cuando se permite y foco restaurado. El fondo y los diálogos inferiores son `inert`; solo el superior recibe interacción. No implementes nuevas superposiciones con listeners independientes.
- `BoardFrame`, `PlayersPanel`, `Rules`, `DiceFace`, `TurnClock` y `GameLayout` comparten presentación sin unificar reglas distintas. Mantén sus estados de carga, estado textual del turno y movimiento reducido.
- El código de invitación usa una fuente monoespaciada y admite reflujo; sus seis caracteres deben seguir siendo seleccionables y el botón de copia debe quedar disponible incluso con letras anchas.

## Responsive y movimiento

Los puntos de ajuste existentes principales son 1100, 800 y 600 px; hay ajustes de 900, 420, 360 px y de poca altura para tableros concretos. Las variables CSS no pueden usarse directamente como condiciones de media queries: estos valores se documentan, no se duplican en JavaScript. Prueba al menos 320, 375, 390, 768 y 1280 px.

Los tableros bidimensionales pueden requerir desplazamiento dentro de su superficie. Backgammon conserva al menos 24 px por casilla; en pantallas estrechas se desplaza el tablero sin ensanchar la página. No recortes controles para ocultar un desbordamiento del documento. Ciudad Fortuna muestra el tablero completo, con inspección de casillas y acciones fuera del tablero.

## Distribución de los juegos

En escritorio, prioriza una partida que mantenga visibles el tablero y las acciones imprescindibles sin reducirlos hasta volverlos difíciles de leer. El tablero es la superficie principal. Coloca participantes a la derecha cuando la composición y el ancho lo permitan; sitúa controles a la izquierda solo si aportan espacio y claridad. Para acciones breves, prefiere controles junto al tablero. Omite columnas vacías y no obligues a los juegos directos como Tres en Raya a usar tres columnas. Revisa especialmente el reflujo entre 901 y 1100 px y las alturas 720–900 px.

En móvil se permite el desplazamiento vertical normal. Mantén objetivos táctiles cómodos, texto legible, manos accesibles y el tablero dentro de su propio contenedor si necesita desplazamiento bidimensional. Evita el desbordamiento horizontal de página y los avisos que muevan o tapen la superficie de juego. Reutiliza `BoardFrame`, `PlayersPanel` y los estilos comunes donde encajen con el juego; no fuerces un sistema nuevo de layouts ni una composición idéntica para todos.

Las transiciones comunes duran 180 ms; las animaciones de jugada tienen duración propia en los hooks. `prefers-reduced-motion`, pestañas ocultas y reconexiones evitan repetir movimientos. No uses una animación como única comunicación de turno o resultado. Nuevos recursos deben declarar procedencia y respetar ambos idiomas, nombres largos y zoom; consulta [ACCESSIBILITY.md](ACCESSIBILITY.md).

## Ciudad Fortuna

Ciudad Fortuna agrupa su presentación, geometría, fichas y animación en `components/CiudadFortunaBoard.tsx`. Sus estilos exclusivos están en `styles/ciudad-fortuna.css`, cargados con el tablero diferido. Las casillas tienen bandas exteriores de grupo y un carril interior reservado para seis fichas; nombres y precios ocupan otra zona. Salida está arriba a la izquierda y el recorrido avanza hacia la derecha. Cada asiento conserva color, figura y posición dentro del carril. El inspector muestra el nombre completo, tarifas y alquiler actual calculado por la misma función que usa el motor.

En escritorio, `BoardFrame` dispone acciones y reloj a la izquierda, tablero en el centro y participantes a la derecha, sin desplazamiento del documento. Los accesos fijos «Propiedades», «Tratos» y «Actividad» preceden a los controles variables del turno; sus botones conservan el mismo ancho. El centro muestra las tres jugadas recientes y la actividad abre el registro completo. El tablero conserva proporción y aprovecha la altura disponible sin un zoom exclusivo. La derecha muestra ficha, saldo, posición, bancarrota y conexión. En móvil se prioriza el tablero y después las acciones y los participantes compactos; el inspector permite leer el nombre completo y las tarifas cuando la miniatura no basta.

El servidor proporciona una ruta identificada por tirada para animar dados, pasos, cartas y cárcel. Reconexión, movimiento reducido y pestaña oculta evitan repeticiones innecesarias. Cambiar saldos o propiedades no reinicia una tirada.

## Superficie de partida

`GameLayout` utiliza columnas laterales equilibradas para centrar geométricamente el título. A la izquierda quedan salir y el logotipo existente; a la derecha, herramientas compactas y Preferencias. En móvil el audio, la privacidad y la pantalla completa siguen disponibles desde ese panel. El código de sala queda en la sala de espera. No hay una segunda franja reservada, avisos repetidos de turno ni texto visual de modo inmersivo.

`BoardFrame` acepta `actions` para la zona izquierda y conserva el tablero y `PlayersPanel` como centro y derecha. Los juegos donde se actúa directamente en la superficie no necesitan un panel izquierdo vacío. Las filas activas tienen fondo, borde y texto; subastas, votaciones y dibujo usan únicamente participantes habilitados por el estado público. El reloj aparece una vez en acciones o, en juegos sencillos, junto a participantes. Los avisos importantes están en ese panel y permiten consultar el mensaje completo en un diálogo, sin desplazar el tablero. Los consejos se consultan dentro de reglas; no ocupan un panel permanente. Dominó conserva su diálogo de fin de ronda y acceso para reabrirlo.

La sala de espera presenta juego, código y una fila de invitación, con «Añadir bot» y «Empezar partida» justo debajo. Las opciones de la partida permanecen visibles; el anfitrión puede editarlas antes de empezar y el grupo ve los valores activos. Cambiar de juego conserva el grupo y las opciones de cada juego.

«Ampliar el juego» solicita pantalla completa sobre la raíz del documento para conservar los diálogos y avisos. Si no está disponible o se rechaza, mantiene el modo inmersivo CSS: reduce textos secundarios y conserva la cabecera fija al desplazarse para que la salida siga accesible. El botón de salida y Escape permiten salir; al cerrar un diálogo con Escape se conserva el modo inmersivo. Las dimensiones comunes emplean `svh` para evitar saltos por las barras móviles y respetan las áreas seguras.

El audio común se sintetiza con Web Audio, está activado inicialmente al 25 % y guarda activación y volumen en `localStorage`. El idioma y el audio se ajustan desde Preferencias, disponible en las cabeceras de las páginas. El audio se inicializa tras un gesto y omite sonidos en segundo plano, durante la recuperación de conexión y en ráfagas. Las acciones locales aceptadas tienen señales de cartas, robo, dados, movimiento, confirmación o ronda; los cambios de turno y el resultado aportan sus propios avisos. No se infieren eventos desde manos o roles privados. La integración detallada de eventos ajenos y fases de cada juego corresponde a su revisión individual.
