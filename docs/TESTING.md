# Probar Sobremesa

## Arrancar

Desde la raíz del proyecto:

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Abre **http://127.0.0.1:5173**. Cuando aparezca «Listo para jugar», la web está conectada al servidor. La terminal debe permanecer abierta. `Ctrl+C` detiene el desarrollo.

La configuración predeterminada utiliza el puerto 5173 para la web y el 3000 para el servidor. No necesitas `.env` para esta prueba. Si esos puertos están ocupados, cierra la otra aplicación que los esté usando antes de arrancar.

## Comprobación manual

### Catálogo, idioma y perfil

- En la primera visita, elige un apodo o genera uno aleatorio. Comprueba el selector Español/English.
- Cambia tu nombre desde el perfil y recarga: debe conservarse.
- Busca `monopoly`: debe aparecer Ciudad Fortuna. Busca `uno`: debe aparecer Cambio de Color.
- Prueba categorías, una búsqueda sin resultados y el botón para limpiar la búsqueda.
- Marca un favorito y entra en «Mis favoritos». Debe seguir guardado tras recargar.

### Partida contra un bot

Abre un juego y elige jugar contra un bot, o pulsa el botón del robot de su ficha. Debes llegar a la sala de configuración. Ajusta el tiempo de turno y las reglas disponibles y pulsa «Empezar partida». Consulta sus reglas y realiza varias jugadas. Cambia de idioma durante la partida: deben mantenerse la sala, cartas, saldo y turno.

| Juego           | Qué comprobar                                                                                                                                                                                                                                                                                                                                   |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ciudad Fortuna  | Tirar dados, consultar casillas, comprar, pujar en una subasta abierta y revisar propiedades. Las ofertas válidas deben superar la puja actual en 10 € y reinician el plazo de 15 s; pasar retira al jugador y al agotarse el tiempo gana la puja más alta. Para cambiar dinero o rondas, crea una sala y ajusta sus opciones antes de empezar. |
| Cambio de Color | Jugar por color o valor, robar, elegir color con un comodín y ocultar la mano del rival.                                                                                                                                                                                                                                                        |
| Cuatro en Línea | Las fichas caen a la casilla libre más baja. Una columna llena deja de aceptar fichas.                                                                                                                                                                                                                                                          |
| Reversi         | Solo se puede jugar sobre los puntos permitidos y las fichas encerradas cambian de color.                                                                                                                                                                                                                                                       |
| Tres en Raya    | Alternar turnos, bloquear casillas ocupadas y mostrar victoria o empate al terminar.                                                                                                                                                                                                                                                            |
| Dados al 100    | Sumar puntos temporales, guardarlos y perder solo los del turno cuando sale un uno.                                                                                                                                                                                                                                                             |

El tablero no debe permitir jugar durante el turno del contrario. Al terminar, el anfitrión puede preparar la revancha.

### Dos jugadores en el mismo ordenador

1. Abre la web en una ventana normal y crea una sala con «Jugar con amigos».
2. Copia su código de seis caracteres.
3. Abre otra ventana privada o un navegador distinto y visita la misma dirección.
4. Entra con el código y comprueba que ambos jugadores aparecen en la sala.
5. Empieza desde la ventana del anfitrión. Alterna jugadas: las dos ventanas deben mostrar los mismos movimientos.
6. Termina una partida de Tres en Raya y prepara la revancha. Las dos ventanas deben volver a la sala.

Usa una ventana nueva; duplicar una pestaña puede copiar su sesión. Cada jugador necesita su propia sesión. Si abres el mismo secreto en otra conexión, esta recupera el puesto y la anterior queda desconectada con la opción «Recuperar aquí».

### Reconexión y salida

Durante una partida, recarga una ventana. Debe recuperar la sala y el estado. También puedes desactivar y reactivar la red desde las herramientas del navegador durante menos de cinco minutos, manteniendo el servidor en marcha.

Prueba a salir de una partida. En un duelo, gana el rival; con más jugadores, el juego continúa según sus reglas. Si sale el anfitrión, otro jugador humano recibe ese papel.

### Tamaños de móvil

En las herramientas de desarrollo del navegador activa la vista de dispositivos. Prueba anchos de 320, 390 y 768 px, además del escritorio. En Ciudad Fortuna comprueba la Salida arriba a la izquierda, las figuras, el color de las propiedades, el último movimiento en el centro, los nombres e iconos de las casillas y las acciones visibles sin desplazarte. Durante una subasta confirma que cualquier postor solvente ve el formulario, el nombre de quien va ganando y el contador reiniciado tras una puja. Prueba «Ampliar tablero» y «Jugadores y propiedades». En Cambio de Color abre un comodín: debes ver los cuatro colores, sus cantidades y tus cartas a la vez. Revisa el catálogo, la sala y cada tablero: botones utilizables, formularios visibles y ausencia de desplazamiento horizontal de toda la página.

Recorre los controles con `Tab`. Los diálogos deben mantener el foco y cerrarse con `Escape` cuando no requieran elegir una acción final.

## Pruebas automáticas

```sh
pnpm check
```

Comprueba el formato, compila el proyecto y ejecuta las pruebas de motores, idiomas, integración y navegador. Estas últimas usan Google Chrome instalado. Para utilizar Chromium:

```sh
pnpm exec playwright install chromium
PLAYWRIGHT_BROWSER=chromium pnpm check
```

También puedes ejecutarlas por separado:

```sh
pnpm test
pnpm test:i18n
pnpm build
pnpm test:integration
pnpm test:e2e
```

Las pruebas de motores incluyen diez partidas simuladas de cada juego, reglas configurables y privacidad de manos. Las de traducciones comprueban cobertura y parámetros. Las de integración incluyen sustitución autenticada de conexiones, varias salas independientes y agotamiento real de turnos de 30 segundos en los seis juegos (por eso tardan algo más de medio minuto). Las de navegador cubren ambos idiomas, primera visita, configuración con bots, visibilidad de controles, selector de color y caída de red. Las de integración arrancan un servidor temporal en el puerto 3190; las de navegador, otro en el 3187. No sustituyen al servidor de desarrollo del puerto 3000.

Los resultados, capturas y trazas quedan en `tests/.output/`, una carpeta generada que se puede borrar y está excluida de Git. Las trazas se guardan cuando falla una prueba.

## Probar la compilación que se alojará

Detén antes `pnpm dev`, porque ambos servidores usan el puerto 3000.

```sh
pnpm build
pnpm start
```

Abre **http://127.0.0.1:3000** y repite una partida entre dos ventanas. **http://127.0.0.1:3000/health** debe responder con `{"status":"ok"}`.

Las pruebas de navegador emulan tamaños de móvil en Chrome. Antes de publicar conviene probar también los dispositivos y navegadores que vayan a usar tus amigos. No hay una prueba de carga que garantice una cifra de jugadores simultáneos.

Para comprobar el reloj sin jugar, crea una sala de dos personas, configura 30 segundos y deja pasar el turno sin tocar nada: ambos navegadores deben recibir la misma jugada automática. Repite en dos salas distintas y comprueba que sus acciones no se mezclan.
