# Sistema de diseño

Sobremesa usa salvia, crema, verdes oscuros, ilustraciones SVG y tipografía editorial para transmitir una mesa compartida. No hay framework de estilos.

## Archivos y cascada

`src/styles.css` es el único índice de estilos globales. Importa primero `styles/tokens.css`, después las diez secciones de la interfaz y finalmente `styles/boards.css`. Las secciones de la interfaz son: `foundation`, `shell`, `catalog`, `dialogs`, `rooms`, `game-layout`, `classic-boards`, `motion`, `responsive` y `refinements`. Cada archivo delimita controles básicos, navegación, catálogo, diálogos, salas o superficie de juego. El orden de importación conserva la cascada: los ajustes responsive y las reglas finales siguen después de las bases. `boards.css` contiene los tableros ampliados y Ciudad Fortuna mantiene su CSS cargado con el componente.

Reutiliza los tokens en superficies compartidas. Conserva el ámbito de las media queries y las alternativas sintácticas necesarias para los navegadores compatibles. No reordenes reglas solo porque comparten selector: podrían competir con variantes intermedias. Una ampliación debería integrarse en la sección correspondiente y evitar otra capa global de sobrescrituras.

Las ilustraciones SVG se agrupan como funciones locales en `src/ui/GameArtwork.tsx`, junto al contenedor, las paletas y el registro exhaustivo de los quince juegos. Ajedrez y damas comparten la misma base. Cada ilustración recibe el identificador único del contenedor para referenciar sus filtros sin colisiones entre tarjetas; no necesita un archivo propio mientras siga siendo una pieza pequeña y exclusiva de este módulo.

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
| Texto / control                   | `--font-body: 14px`, `--font-control: 12px`; títulos editoriales Georgia                                    |
| Controles                         | `--control-height: 44px`, `--radius-control: 8px`                                                           |
| Diálogo                           | `--radius-dialog: 17px`, `--shadow-dialog`                                                                  |
| Transición / capas                | `--duration-fast: .18s`, `--layer-dialog: 80`, `--layer-notice: 70`                                         |

Los tokens definen el vocabulario común de los componentes. Los estilos de fichas, casillas y tableros pueden tener valores específicos. Los avisos de partida tienen reglas de capa propias. No cambies en bloque todos los colores iguales: una casilla, una ficha y un estado semántico pueden necesitar evolucionar por separado.

El verde sobre crema y blanco sobre verde son combinaciones principales. El texto secundario usa `#626f5d`. El foco utiliza una variante oscura sobre superficies claras y una clara en la barra lateral. Acentos y bordes suaves no bastan para identificar controles por sí solos; conserva texto, forma y foco. La comprobación automática de contraste depende del contexto y no acredita todos los estados.

## Componentes y comportamiento

- `.button` y variantes `.primary`, `.secondary`, `.small`: acción, hover y disabled coherentes. `.icon-button` requiere nombre accesible. `busy` bloquea duplicados; no sustituye la autorización del servidor.
- `.field`, etiquetas y pistas: errores en lenguaje comprensible, enlazados al campo cuando corresponda. Mantén los selects nativos y no uses placeholder como única etiqueta.
- `Modal`: título asociado, foco inicial, Tab contenido, Escape cuando se permite y foco restaurado. El fondo y los diálogos inferiores son `inert`; solo el superior recibe interacción. No implementes nuevas superposiciones con listeners independientes.
- `BoardFrame`, `PlayersPanel`, `Rules`, `DiceFace`, `TurnClock` y `GameLayout` comparten presentación sin unificar reglas distintas. Mantén sus estados de carga, anuncios de turno y movimiento reducido.
- El código de invitación usa una fuente monoespaciada y admite reflujo; sus seis caracteres deben seguir siendo seleccionables y el botón de copia debe quedar disponible incluso con letras anchas.

## Responsive y movimiento

Los puntos de ajuste existentes principales son 1100, 800 y 600 px; hay ajustes de 900, 420, 360 px y de poca altura para tableros concretos. Las variables CSS no pueden usarse directamente como condiciones de media queries: estos valores se documentan, no se duplican en JavaScript. Prueba al menos 320, 375, 390, 768 y 1280 px.

Los tableros bidimensionales pueden requerir desplazamiento dentro de su superficie. Backgammon conserva al menos 24 px por casilla; en pantallas estrechas se desplaza el tablero sin ensanchar la página. No recortes controles para ocultar un desbordamiento del documento. En Ciudad Fortuna se conserva la vista ampliada y las acciones fuera del tablero.

Las transiciones comunes duran 180 ms; las animaciones de jugada tienen duración propia en los hooks. `prefers-reduced-motion`, pestañas ocultas y reconexiones evitan repetir movimientos. No uses una animación como única comunicación de turno o resultado. Nuevos recursos deben declarar procedencia y respetar ambos idiomas, nombres largos y zoom; consulta [ACCESSIBILITY.md](ACCESSIBILITY.md).

## Ciudad Fortuna

Ciudad Fortuna agrupa su presentación, geometría, fichas y animación en `components/CiudadFortunaBoard.tsx`. Sus estilos exclusivos están en `styles/ciudad-fortuna.css`, cargados con el tablero diferido. Las casillas tienen bandas exteriores de grupo y un carril interior reservado para seis fichas; nombres y precios ocupan otra zona. Salida está arriba a la izquierda y el recorrido avanza hacia la derecha. Cada asiento conserva color, figura y posición dentro del carril. El inspector muestra el nombre completo, tarifas y alquiler actual calculado por la misma función que usa el motor.

En escritorio, el tablero mantiene un tamaño mínimo legible cuando hay espacio; puede requerir desplazamiento vertical en un portátil bajo. Los controles principales están en el centro y la cartera tiene desplazamiento independiente. En móvil, los jugadores aparecen sobre el tablero y las acciones en una barra inferior. Por debajo de 600 px se abre en vista ampliada con desplazamiento, con opción de vista completa y centrado de la casilla activa al terminar el movimiento. La cartera se abre en un diálogo accesible.

Al comenzar el turno propio aparece un aviso breve y accesible, además del indicador persistente. El servidor proporciona una ruta identificada por tirada para animar dados, pasos, cartas y cárcel. Reconexión, movimiento reducido y pestaña oculta evitan repeticiones innecesarias. Los cambios posteriores de saldo o propiedades no reinician la animación de una tirada.
