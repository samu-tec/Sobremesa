# Uso del código y materiales

Sobremesa es un proyecto personal de Samuel Ciocan. La aplicación es gratuita, sin anuncios, pagos, apuestas ni premios económicos.

## Código fuente

El código propio tiene derechos reservados según [LICENSE](../LICENSE). Se permite consultarlo y evaluarlo localmente sin modificarlo. Modificarlo, reutilizarlo en otros proyectos, redistribuirlo o explotarlo comercialmente requiere autorización previa por escrito en contacto@samuelciocan.com. Su disponibilidad pública no lo convierte en código abierto.

La publicación respeta los derechos de consulta y fork dentro de GitHub establecidos por sus [condiciones del servicio](https://docs.github.com/en/site-policy/github-terms/github-terms-of-service#5-license-grant-to-other-users). La reserva de derechos no restringe las excepciones legales ni las licencias de terceros.

## Dependencias y juegos

Las dependencias conservan sus licencias y avisos originales. `scripts/generate-notices.mjs` recopila las licencias de las dependencias que recibe el navegador, incluidas las transitivas, y las publica en `/third-party-notices.txt`. También publica las condiciones del código propio en `/license.txt`. La compilación falla si falta un aviso requerido por el generador.

El catálogo utiliza los nombres de Sobremesa y busca por nombre, descripción y categoría. No incorpora alias comerciales de otros juegos. Los identificadores internos históricos se conservan para mantener la compatibilidad de salas, preferencias y eventos; no se utilizan como términos de búsqueda ni como nombres visibles.

Para incorporar código, textos, cartas, ilustraciones o tableros de terceros, comprueba su licencia y documenta la autorización correspondiente. No añadas logotipos o mascotas de otros fabricantes sin los derechos necesarios. El repositorio no concede derechos sobre marcas ajenas ni afirma afiliación con sus titulares. Las ideas y principios de un programa y su expresión concreta reciben tratamientos distintos en la [Ley de Propiedad Intelectual, artículo 96](https://www.boe.es/buscar/act.php?id=BOE-A-1996-8930#a96). Retirar alias no acredita por sí solo la independencia jurídica de todos los textos, cartas, ilustraciones o diseños: debe poder justificarse la procedencia del material propio y la autorización del ajeno.

Parchís, Juego de la Oca, Go, Damas chinas, Mahjong tradicional, Brisca, Mus, Escoba, Cinquillo y Texas Hold’em incorporan código, textos y dibujos SVG propios para tableros tradicionales. Los iconos de casillas de la Oca proceden de la dependencia Lucide ya utilizada y mantienen sus avisos. Las fuentes enlazadas en [GAME_RULES.md](GAME_RULES.md) se consultan para contrastar mecánicas y variantes; no se han incorporado recursos, ilustraciones ni manuales de esas plataformas. Esto documenta la procedencia de la implementación, sin certificar una conformidad jurídica general.

## Privacidad

La información para los jugadores está en `/privacy`, en español e inglés: responsable, contacto, datos necesarios, conservación temporal, almacenamiento funcional y derechos. La aplicación no incorpora analítica, publicidad ni registros de acceso. Las salas y límites antiabuso se mantienen temporalmente en memoria; no hay historial de partidas ni base de datos de perfiles.

El servicio se aloja en un servidor propio y se expone mediante Cloudflare Tunnel, administrado fuera de este repositorio. El tratamiento de datos técnicos de Cloudflare debe comprobarse en la configuración efectiva y en sus [condiciones de tratamiento](https://www.cloudflare.com/cloudflare-customer-dpa/). El operador debe evitar registros de acceso innecesarios, ajustar la conservación al mínimo, verificar encargados y transferencias y mantener el aviso acorde con esa configuración. El código no permite certificar por sí solo esas condiciones externas.

Referencias: [RGPD](https://eur-lex.europa.eu/eli/reg/2016/679/oj?locale=es), [LSSI, artículo 22.2](https://www.boe.es/buscar/act.php?id=BOE-A-2002-13758#a22) y [guía de cookies de la AEPD](https://www.aepd.es/guias/guia-cookies.pdf). El almacenamiento funcional se limita a la sesión y a las preferencias solicitadas; cualquier futura analítica o finalidad adicional exige reevaluar la información y el consentimiento.

## Diccionarios locales

Palabras cruzadas utiliza únicamente en el servidor `an-array-of-spanish-words@2.0.0` y `an-array-of-english-words@2.0.0`, distribuidos bajo licencia MIT por Zeke Sikelianos (2016 y 2014, respectivamente). Sus paquetes y licencias originales se conservan como dependencias de producción. Fuentes: [español](https://github.com/words/an-array-of-spanish-words) e [inglés](https://github.com/words/an-array-of-english-words). Se normalizan tildes, se conserva Ñ y se filtran palabras de dos a once letras; no se añade contenido remoto durante una partida. El tablero, la bolsa y la puntuación de Sobremesa son propios; estos listados no se presentan como diccionarios oficiales de competición.

Los mapas, personajes, objetos, narrativas, preguntas bilingües, conceptos de dibujo, distribuciones de fichas y reglas expresivas de los cinco juegos nuevos de palabras, sociales y estrategia se han redactado y dibujado para Sobremesa. Los naipes franceses y españoles son representaciones geométricas propias. Texas Hold’em utiliza únicamente fichas ficticias sin valor económico.
