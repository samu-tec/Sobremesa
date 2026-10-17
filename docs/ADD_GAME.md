# Añadir un juego

Esta guía describe el mantenimiento por el titular o personas autorizadas conforme a [LICENSE](../LICENSE).

Usa como referencia un motor pequeño (`games/mancala/engine.ts`), su tablero y las pruebas del mismo juego. No copies reglas de un motor distinto ni agregues comprobaciones específicas en `RoomManager`.

1. Añade un identificador estable a `GameType` en `types/index.ts`. Incorpora su estado público y acciones a `GamePublicState` y `GameAction`. Define tipos discriminados para las acciones y separa estado interno/público si hay secretos. Exporta los tipos y el motor desde `src/index.ts`.
2. Crea `games/<juego>/engine.ts` implementando `IGameEngine<S, A, P>`. Valida número e identidad de jugadores, datos desconocidos, enteros, límites, fase, turno y pertenencia. `applyAction` debe rechazar acciones inválidas y devolver un estado nuevo sin mutar el anterior. Un abandono ajeno o sobre una partida terminada es inocuo. Define explícitamente victoria, empates y abandono multijugador.
3. Implementa `getSanitizedState` por destinatario. Prueba que no salen manos, mazos, flotas, votos o roles ajenos. El bot debe producir una acción válida o `null` cuando no le toque. En juegos con información oculta, usa su vista pública para decidir. La aleatoriedad de reglas puede recibir una función `() => number` con `systemRandom` como valor predeterminado; los secretos usan exclusivamente criptografía en el servidor.
4. Añade metadatos en `GAME_DEFINITIONS`: id, nombre, categoría, duración, jugadores, descripción, reglas y consejo. La clave y el id deben coincidir. Declara opciones en `GAME_SETTINGS` o `[]` si no las hay. El esquema compartido ya alimenta formularios, validación y reglas; `setRules` debe resolver las mismas opciones antes de iniciar. No sigas ampliando las ramas históricas de Ciudad Fortuna y Cambio de Color.
5. Registra una fábrica en `apps/sobremesa-server/src/games/engines.ts`. Para un juego de una acción por turno basta `defineGame(new MiEngine())`. Si hay fases intermedias, turnos repetidos o decisiones fuera de turno, define las políticas necesarias:

```ts
miJuego: () => defineGame(new MiEngine(), {
  completed: (_state, action) => action.type === 'END_TURN',
  continueTimeout: (action) => action.type !== 'END_TURN',
  // timeoutAction: una acción legal y conservadora; por defecto usa getBotAction.
  // actor: solo si currentTurn/currentTurnPlayerId no representan el presupuesto.
  // expire/timeoutSeconds: solo para plazos de fases con resolución propia.
}),
```

El ejemplo ilustra una entrada; `miJuego` y `MiEngine` se sustituyen por el identificador y motor reales. Cada fábrica crea una instancia: nunca compartas opciones mutables entre salas. `defineGame` proporciona `createMatch` y `configureRules`; conserva el estado concreto dentro de esa clausura. El gestor recibe `GameMatch`, nunca un motor o estado con `any`. Si una opción necesita un adaptador específico, declara `configureRules` en la fábrica, como Cambio de Color. Prueba que los pasos intermedios no reinicien indebidamente el reloj y que el timeout siempre progrese dentro del límite de cien acciones.

6. Crea un tablero `BoardProps<P, A>` en el cliente. Añade su importación `lazy` y adaptador en `GameBoard.tsx`; nunca importes React en lógica/servidor. Usa `BoardFrame`, componentes existentes y tokens de `styles/`. Los estilos grandes y exclusivos pueden acompañar al tablero, como `ciudad-fortuna/`. Agrega su paleta y arte SVG en `GameArtwork.tsx`, sin recursos de procedencia dudosa.
7. Pasa los textos por `t` y los mensajes del motor por `message`/`term`. Traduce catálogo, reglas, opciones y mensajes en `i18n/en.ts`. No traduzcas apodos ni construyas frases concatenando traducciones. Ejecuta `pnpm test:i18n`.
8. Usa botones con nombres accesibles y operaciones por teclado. Asegura selección alternativa a arrastrar, foco visible, objetivos utilizables, orientación, información que no dependa solo del color y movimiento reducido. Usa `Modal` para diálogo y comprueba foco restaurado. Los avisos importantes deben ser comprensibles sin mirar una animación.
9. Añade pruebas de reglas/variantes, victoria/empate aplicable, turnos inválidos, acciones malformadas, inmutabilidad y conservación de piezas. Prueba partida completa con bots, abandono, privacidad, dos salas, reconexión, reloj y límites. Extiende la cobertura explícita de integración y navegador para el nuevo juego, a 320 y 1280 px y en ambos idiomas. Las regresiones automáticas del registro se amplían mediante el catálogo; actualiza el recuento esperado de juegos de forma intencionada.
10. Ejecuta `pnpm check`, los otros navegadores disponibles y `pnpm test:docker`. Revisa el diff, documenta reglas nuevas y posibles derechos de terceros. No despliegues ni alteres la infraestructura real.

El compilador obliga a completar los registros estáticos. También hay puntos intencionadamente explícitos: tipos, ilustraciones, textos y casos particulares de prueba. El registro no sustituye la revisión funcional ni convierte juegos distintos en un único motor.
