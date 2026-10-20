import type { QuizQuestion } from 'sobremesa-logic';
/** Preguntas y traducciones redactadas para Sobremesa; sin contenido de servicios externos. */
export const quizQuestions: readonly QuizQuestion[] = [
  {
    id: 'q001',
    category: 'Ciencia',
    prompt: {
      es: '¿Qué unidad se usa para medir la resistencia eléctrica?',
      en: 'Which unit measures electrical resistance?',
    },
    choices: {
      es: ['Ohmio', 'Vatio', 'Julio', 'Hercio'],
      en: ['Ohm', 'Watt', 'Joule', 'Hertz'],
    },
    answer: 0,
  },
  {
    id: 'q002',
    category: 'Ciencia',
    prompt: {
      es: '¿Qué planeta tiene el año más corto?',
      en: 'Which planet has the shortest year?',
    },
    choices: {
      es: ['Mercurio', 'Venus', 'Marte', 'Júpiter'],
      en: ['Mercury', 'Venus', 'Mars', 'Jupiter'],
    },
    answer: 0,
  },
  {
    id: 'q003',
    category: 'Ciencia',
    prompt: {
      es: '¿Qué gas forma la mayor parte del aire seco terrestre?',
      en: 'Which gas makes up most of Earth’s dry air?',
    },
    choices: {
      es: ['Nitrógeno', 'Oxígeno', 'Helio', 'Dióxido de carbono'],
      en: ['Nitrogen', 'Oxygen', 'Helium', 'Carbon dioxide'],
    },
    answer: 0,
  },
  {
    id: 'q004',
    category: 'Ciencia',
    prompt: {
      es: '¿Qué instrumento compara masas con dos platillos?',
      en: 'Which instrument compares masses using two pans?',
    },
    choices: {
      es: ['Balanza', 'Termómetro', 'Barómetro', 'Anemómetro'],
      en: ['Balance', 'Thermometer', 'Barometer', 'Anemometer'],
    },
    answer: 0,
  },
  {
    id: 'q005',
    category: 'Ciencia',
    prompt: {
      es: '¿Cuántos protones tiene un átomo de carbono?',
      en: 'How many protons does a carbon atom have?',
    },
    choices: {
      es: ['6', '8', '12', '14'],
      en: ['6', '8', '12', '14'],
    },
    answer: 0,
  },
  {
    id: 'q006',
    category: 'Ciencia',
    prompt: {
      es: '¿Qué cambio convierte un sólido directamente en gas?',
      en: 'Which change turns a solid directly into gas?',
    },
    choices: {
      es: ['Sublimación', 'Fusión', 'Condensación', 'Solidificación'],
      en: ['Sublimation', 'Melting', 'Condensation', 'Freezing'],
    },
    answer: 0,
  },
  {
    id: 'q007',
    category: 'Ciencia',
    prompt: {
      es: '¿Qué tipo de lente concentra rayos paralelos de luz?',
      en: 'Which lens type brings parallel light rays together?',
    },
    choices: {
      es: ['Convergente', 'Divergente', 'Plana', 'Opaca'],
      en: ['Converging', 'Diverging', 'Flat', 'Opaque'],
    },
    answer: 0,
  },
  {
    id: 'q008',
    category: 'Ciencia',
    prompt: {
      es: '¿Qué partícula tiene carga eléctrica negativa?',
      en: 'Which particle has a negative electric charge?',
    },
    choices: {
      es: ['Electrón', 'Protón', 'Neutrón', 'Fotón'],
      en: ['Electron', 'Proton', 'Neutron', 'Photon'],
    },
    answer: 0,
  },
  {
    id: 'q009',
    category: 'Ciencia',
    prompt: {
      es: '¿Qué metal es líquido a veinte grados Celsius?',
      en: 'Which metal is liquid at twenty degrees Celsius?',
    },
    choices: {
      es: ['Mercurio', 'Aluminio', 'Cobre', 'Hierro'],
      en: ['Mercury', 'Aluminium', 'Copper', 'Iron'],
    },
    answer: 0,
  },
  {
    id: 'q010',
    category: 'Ciencia',
    prompt: {
      es: '¿Qué magnitud mide un termómetro?',
      en: 'What does a thermometer measure?',
    },
    choices: {
      es: ['Temperatura', 'Masa', 'Presión', 'Distancia'],
      en: ['Temperature', 'Mass', 'Pressure', 'Distance'],
    },
    answer: 0,
  },
  {
    id: 'q011',
    category: 'Ciencia',
    prompt: {
      es: '¿Qué fuerza mantiene los planetas en órbita alrededor del Sol?',
      en: 'Which force keeps planets orbiting the Sun?',
    },
    choices: {
      es: ['Gravedad', 'Fricción', 'Empuje', 'Tensión superficial'],
      en: ['Gravity', 'Friction', 'Buoyancy', 'Surface tension'],
    },
    answer: 0,
  },
  {
    id: 'q012',
    category: 'Ciencia',
    prompt: {
      es: '¿Qué órgano impulsa la sangre por el cuerpo humano?',
      en: 'Which organ pumps blood through the human body?',
    },
    choices: {
      es: ['Corazón', 'Pulmón', 'Hígado', 'Estómago'],
      en: ['Heart', 'Lung', 'Liver', 'Stomach'],
    },
    answer: 0,
  },
  {
    id: 'q013',
    category: 'Naturaleza',
    prompt: {
      es: '¿Qué animal respira con branquias durante toda su vida adulta?',
      en: 'Which animal breathes with gills throughout its adult life?',
    },
    choices: {
      es: ['Sardina', 'Delfín', 'Tortuga', 'Pingüino'],
      en: ['Sardine', 'Dolphin', 'Turtle', 'Penguin'],
    },
    answer: 0,
  },
  {
    id: 'q014',
    category: 'Naturaleza',
    prompt: {
      es: '¿Qué parte de la planta absorbe normalmente agua del suelo?',
      en: 'Which plant part usually absorbs water from soil?',
    },
    choices: {
      es: ['Raíz', 'Pétalo', 'Fruto', 'Polen'],
      en: ['Root', 'Petal', 'Fruit', 'Pollen'],
    },
    answer: 0,
  },
  {
    id: 'q015',
    category: 'Naturaleza',
    prompt: {
      es: '¿Cuántas patas tiene una araña adulta?',
      en: 'How many legs does an adult spider have?',
    },
    choices: {
      es: ['8', '6', '10', '12'],
      en: ['8', '6', '10', '12'],
    },
    answer: 0,
  },
  {
    id: 'q016',
    category: 'Naturaleza',
    prompt: {
      es: '¿Cuál de estos animales es un mamífero?',
      en: 'Which of these animals is a mammal?',
    },
    choices: {
      es: ['Murciélago', 'Golondrina', 'Cocodrilo', 'Salamandra'],
      en: ['Bat', 'Swallow', 'Crocodile', 'Salamander'],
    },
    answer: 0,
  },
  {
    id: 'q017',
    category: 'Naturaleza',
    prompt: {
      es: '¿Qué producen las abejas a partir del néctar?',
      en: 'What do bees make from nectar?',
    },
    choices: {
      es: ['Miel', 'Seda', 'Resina', 'Cera de árbol'],
      en: ['Honey', 'Silk', 'Resin', 'Tree wax'],
    },
    answer: 0,
  },
  {
    id: 'q018',
    category: 'Naturaleza',
    prompt: {
      es: '¿Qué árbol produce bellotas?',
      en: 'Which tree produces acorns?',
    },
    choices: {
      es: ['Roble', 'Olivo', 'Pino', 'Abedul'],
      en: ['Oak', 'Olive', 'Pine', 'Birch'],
    },
    answer: 0,
  },
  {
    id: 'q019',
    category: 'Naturaleza',
    prompt: {
      es: '¿Qué animal pasa por una fase de renacuajo?',
      en: 'Which animal goes through a tadpole stage?',
    },
    choices: {
      es: ['Rana', 'Lagarto', 'Tiburón', 'Gorrión'],
      en: ['Frog', 'Lizard', 'Shark', 'Sparrow'],
    },
    answer: 0,
  },
  {
    id: 'q020',
    category: 'Naturaleza',
    prompt: {
      es: '¿Qué grupo incluye a los pulpos?',
      en: 'Which group includes octopuses?',
    },
    choices: {
      es: ['Moluscos', 'Insectos', 'Anfibios', 'Reptiles'],
      en: ['Molluscs', 'Insects', 'Amphibians', 'Reptiles'],
    },
    answer: 0,
  },
  {
    id: 'q021',
    category: 'Naturaleza',
    prompt: {
      es: '¿Qué pigmento permite captar luz en las hojas verdes?',
      en: 'Which pigment captures light in green leaves?',
    },
    choices: {
      es: ['Clorofila', 'Melanina', 'Hemoglobina', 'Queratina'],
      en: ['Chlorophyll', 'Melanin', 'Haemoglobin', 'Keratin'],
    },
    answer: 0,
  },
  {
    id: 'q022',
    category: 'Naturaleza',
    prompt: {
      es: '¿Qué ave no puede volar?',
      en: 'Which bird cannot fly?',
    },
    choices: {
      es: ['Avestruz', 'Águila', 'Vencejo', 'Albatros'],
      en: ['Ostrich', 'Eagle', 'Swift', 'Albatross'],
    },
    answer: 0,
  },
  {
    id: 'q023',
    category: 'Naturaleza',
    prompt: {
      es: '¿Qué animal es conocido por construir presas en ríos?',
      en: 'Which animal is known for building dams in rivers?',
    },
    choices: {
      es: ['Castor', 'Lince', 'Zorro', 'Tejón'],
      en: ['Beaver', 'Lynx', 'Fox', 'Badger'],
    },
    answer: 0,
  },
  {
    id: 'q024',
    category: 'Naturaleza',
    prompt: {
      es: '¿Qué entorno tiene suelo permanentemente helado llamado permafrost?',
      en: 'Which environment has permanently frozen ground called permafrost?',
    },
    choices: {
      es: ['Tundra', 'Selva tropical', 'Sabana', 'Manglar'],
      en: ['Tundra', 'Tropical rainforest', 'Savanna', 'Mangrove'],
    },
    answer: 0,
  },
  {
    id: 'q025',
    category: 'Mapas',
    prompt: {
      es: '¿En qué continente se encuentra el desierto de Atacama?',
      en: 'Which continent contains the Atacama Desert?',
    },
    choices: {
      es: ['América del Sur', 'África', 'Asia', 'Oceanía'],
      en: ['South America', 'Africa', 'Asia', 'Oceania'],
    },
    answer: 0,
  },
  {
    id: 'q026',
    category: 'Mapas',
    prompt: {
      es: '¿Qué océano queda al este de África?',
      en: 'Which ocean lies east of Africa?',
    },
    choices: {
      es: ['Índico', 'Atlántico', 'Ártico', 'Pacífico'],
      en: ['Indian', 'Atlantic', 'Arctic', 'Pacific'],
    },
    answer: 0,
  },
  {
    id: 'q027',
    category: 'Mapas',
    prompt: {
      es: '¿Qué río atraviesa París?',
      en: 'Which river runs through Paris?',
    },
    choices: {
      es: ['Sena', 'Támesis', 'Danubio', 'Tíber'],
      en: ['Seine', 'Thames', 'Danube', 'Tiber'],
    },
    answer: 0,
  },
  {
    id: 'q028',
    category: 'Mapas',
    prompt: {
      es: '¿Qué país tiene forma aproximada de bota en el mapa?',
      en: 'Which country roughly resembles a boot on a map?',
    },
    choices: {
      es: ['Italia', 'Portugal', 'Grecia', 'Noruega'],
      en: ['Italy', 'Portugal', 'Greece', 'Norway'],
    },
    answer: 0,
  },
  {
    id: 'q029',
    category: 'Mapas',
    prompt: {
      es: '¿Qué línea imaginaria divide los hemisferios norte y sur?',
      en: 'Which imaginary line divides the northern and southern hemispheres?',
    },
    choices: {
      es: ['Ecuador', 'Trópico de Cáncer', 'Meridiano de Greenwich', 'Círculo polar ártico'],
      en: ['Equator', 'Tropic of Cancer', 'Greenwich meridian', 'Arctic Circle'],
    },
    answer: 0,
  },
  {
    id: 'q030',
    category: 'Mapas',
    prompt: {
      es: '¿Qué cordillera separa España y Francia?',
      en: 'Which mountain range separates Spain and France?',
    },
    choices: {
      es: ['Pirineos', 'Alpes', 'Andes', 'Apeninos'],
      en: ['Pyrenees', 'Alps', 'Andes', 'Apennines'],
    },
    answer: 0,
  },
  {
    id: 'q031',
    category: 'Mapas',
    prompt: {
      es: '¿Qué isla alberga los países de Haití y República Dominicana?',
      en: 'Which island contains Haiti and the Dominican Republic?',
    },
    choices: {
      es: ['La Española', 'Cuba', 'Jamaica', 'Puerto Rico'],
      en: ['Hispaniola', 'Cuba', 'Jamaica', 'Puerto Rico'],
    },
    answer: 0,
  },
  {
    id: 'q032',
    category: 'Mapas',
    prompt: {
      es: '¿En qué país está la ciudad de Kioto?',
      en: 'In which country is Kyoto?',
    },
    choices: {
      es: ['Japón', 'China', 'Vietnam', 'Tailandia'],
      en: ['Japan', 'China', 'Vietnam', 'Thailand'],
    },
    answer: 0,
  },
  {
    id: 'q033',
    category: 'Mapas',
    prompt: {
      es: '¿Cuál de estos mares no tiene salida natural al océano?',
      en: 'Which of these seas has no natural outlet to an ocean?',
    },
    choices: {
      es: ['Caspio', 'Mediterráneo', 'Rojo', 'Caribe'],
      en: ['Caspian', 'Mediterranean', 'Red', 'Caribbean'],
    },
    answer: 0,
  },
  {
    id: 'q034',
    category: 'Mapas',
    prompt: {
      es: '¿En qué continente está el monte Kilimanjaro?',
      en: 'On which continent is Mount Kilimanjaro?',
    },
    choices: {
      es: ['África', 'Asia', 'Europa', 'América del Norte'],
      en: ['Africa', 'Asia', 'Europe', 'North America'],
    },
    answer: 0,
  },
  {
    id: 'q035',
    category: 'Mapas',
    prompt: {
      es: '¿Qué punto cardinal queda enfrente del oeste?',
      en: 'Which compass direction is opposite west?',
    },
    choices: {
      es: ['Este', 'Norte', 'Sur', 'Noroeste'],
      en: ['East', 'North', 'South', 'Northwest'],
    },
    answer: 0,
  },
  {
    id: 'q036',
    category: 'Mapas',
    prompt: {
      es: '¿Qué país comparte la isla de Irlanda con el Reino Unido?',
      en: 'Which country shares the island of Ireland with the United Kingdom?',
    },
    choices: {
      es: ['Irlanda', 'Islandia', 'Dinamarca', 'Bélgica'],
      en: ['Ireland', 'Iceland', 'Denmark', 'Belgium'],
    },
    answer: 0,
  },
  {
    id: 'q037',
    category: 'Arte',
    prompt: {
      es: '¿Cuántas líneas tiene un pentagrama musical?',
      en: 'How many lines are on a musical staff?',
    },
    choices: {
      es: ['5', '4', '6', '7'],
      en: ['5', '4', '6', '7'],
    },
    answer: 0,
  },
  {
    id: 'q038',
    category: 'Arte',
    prompt: {
      es: '¿Qué instrumento suele tener ochenta y ocho teclas?',
      en: 'Which instrument usually has eighty-eight keys?',
    },
    choices: {
      es: ['Piano', 'Violín', 'Flauta', 'Trompeta'],
      en: ['Piano', 'Violin', 'Flute', 'Trumpet'],
    },
    answer: 0,
  },
  {
    id: 'q039',
    category: 'Arte',
    prompt: {
      es: '¿Qué nombre recibe una pintura sobre yeso húmedo?',
      en: 'What is a painting on wet plaster called?',
    },
    choices: {
      es: ['Fresco', 'Grabado', 'Mosaico', 'Collage'],
      en: ['Fresco', 'Engraving', 'Mosaic', 'Collage'],
    },
    answer: 0,
  },
  {
    id: 'q040',
    category: 'Arte',
    prompt: {
      es: '¿Qué técnica construye imágenes con pequeñas piezas de colores?',
      en: 'Which technique builds images from small coloured pieces?',
    },
    choices: {
      es: ['Mosaico', 'Acuarela', 'Carboncillo', 'Fotografía'],
      en: ['Mosaic', 'Watercolour', 'Charcoal drawing', 'Photography'],
    },
    answer: 0,
  },
  {
    id: 'q041',
    category: 'Arte',
    prompt: {
      es: '¿Qué material se obtiene al cocer barro modelado?',
      en: 'What material is made by firing shaped clay?',
    },
    choices: {
      es: ['Cerámica', 'Vidrio', 'Papel', 'Mármol'],
      en: ['Ceramic', 'Glass', 'Paper', 'Marble'],
    },
    answer: 0,
  },
  {
    id: 'q042',
    category: 'Arte',
    prompt: {
      es: '¿Qué voz es habitualmente la más grave de un coro mixto?',
      en: 'Which voice is usually lowest in a mixed choir?',
    },
    choices: {
      es: ['Bajo', 'Tenor', 'Contralto', 'Soprano'],
      en: ['Bass', 'Tenor', 'Alto', 'Soprano'],
    },
    answer: 0,
  },
  {
    id: 'q043',
    category: 'Arte',
    prompt: {
      es: '¿Qué figura musical dura la mitad que una negra?',
      en: 'Which note lasts half as long as a crotchet?',
    },
    choices: {
      es: ['Corchea', 'Blanca', 'Redonda', 'Breve'],
      en: ['Quaver', 'Minim', 'Semibreve', 'Breve'],
    },
    answer: 0,
  },
  {
    id: 'q044',
    category: 'Arte',
    prompt: {
      es: '¿Qué arte utiliza principalmente el movimiento del cuerpo?',
      en: 'Which art primarily uses body movement?',
    },
    choices: {
      es: ['Danza', 'Escultura', 'Grabado', 'Arquitectura'],
      en: ['Dance', 'Sculpture', 'Engraving', 'Architecture'],
    },
    answer: 0,
  },
  {
    id: 'q045',
    category: 'Arte',
    prompt: {
      es: '¿Qué describe el tempo de una pieza musical?',
      en: 'What does a musical piece’s tempo describe?',
    },
    choices: {
      es: ['Su velocidad', 'Su volumen', 'Su tonalidad', 'Su instrumento'],
      en: ['Its speed', 'Its loudness', 'Its key', 'Its instrument'],
    },
    answer: 0,
  },
  {
    id: 'q046',
    category: 'Arte',
    prompt: {
      es: '¿Qué herramienta se usa para esculpir madera retirando virutas?',
      en: 'Which tool carves wood by removing chips?',
    },
    choices: {
      es: ['Gubia', 'Rodillo', 'Pincel', 'Compás'],
      en: ['Gouge', 'Roller', 'Paintbrush', 'Compass'],
    },
    answer: 0,
  },
  {
    id: 'q047',
    category: 'Arte',
    prompt: {
      es: '¿Qué disciplina diseña edificios y espacios habitables?',
      en: 'Which discipline designs buildings and living spaces?',
    },
    choices: {
      es: ['Arquitectura', 'Caligrafía', 'Cerámica', 'Danza'],
      en: ['Architecture', 'Calligraphy', 'Ceramics', 'Dance'],
    },
    answer: 0,
  },
  {
    id: 'q048',
    category: 'Arte',
    prompt: {
      es: '¿Qué marca musical indica silencio durante cierto tiempo?',
      en: 'Which musical symbol indicates silence for a duration?',
    },
    choices: {
      es: ['Silencio', 'Sostenido', 'Ligadura', 'Clave'],
      en: ['Rest', 'Sharp', 'Tie', 'Clef'],
    },
    answer: 0,
  },
  {
    id: 'q049',
    category: 'Lógica',
    prompt: {
      es: 'Una caja tiene tres filas de cuatro piezas. ¿Cuántas piezas hay?',
      en: 'A box has three rows of four pieces. How many pieces are there?',
    },
    choices: {
      es: ['12', '7', '9', '16'],
      en: ['12', '7', '9', '16'],
    },
    answer: 0,
  },
  {
    id: 'q050',
    category: 'Lógica',
    prompt: {
      es: 'Si doblas una hoja una vez, ¿cuántas capas quedan?',
      en: 'If you fold a sheet once, how many layers are there?',
    },
    choices: {
      es: ['2', '1', '3', '4'],
      en: ['2', '1', '3', '4'],
    },
    answer: 0,
  },
  {
    id: 'q051',
    category: 'Lógica',
    prompt: {
      es: '¿Qué número sigue a 3, 6, 9, 12 si el salto es constante?',
      en: 'Which number follows 3, 6, 9, 12 with a constant step?',
    },
    choices: {
      es: ['15', '14', '16', '18'],
      en: ['15', '14', '16', '18'],
    },
    answer: 0,
  },
  {
    id: 'q052',
    category: 'Lógica',
    prompt: {
      es: '¿Cuántos minutos hay en una hora y media?',
      en: 'How many minutes are in an hour and a half?',
    },
    choices: {
      es: ['90', '60', '75', '120'],
      en: ['90', '60', '75', '120'],
    },
    answer: 0,
  },
  {
    id: 'q053',
    category: 'Lógica',
    prompt: {
      es: '¿Qué fracción equivale a un cuarto?',
      en: 'Which fraction equals one quarter?',
    },
    choices: {
      es: ['2/8', '2/6', '3/8', '1/2'],
      en: ['2/8', '2/6', '3/8', '1/2'],
    },
    answer: 0,
  },
  {
    id: 'q054',
    category: 'Lógica',
    prompt: {
      es: 'Un cuadrado tiene un lado de cinco centímetros. ¿Cuál es su perímetro?',
      en: 'A square has sides of five centimetres. What is its perimeter?',
    },
    choices: {
      es: ['20 cm', '10 cm', '15 cm', '25 cm'],
      en: ['20 cm', '10 cm', '15 cm', '25 cm'],
    },
    answer: 0,
  },
  {
    id: 'q055',
    category: 'Lógica',
    prompt: {
      es: 'Tres personas se saludan una vez con cada otra. ¿Cuántos saludos hay?',
      en: 'Three people each greet every other person once. How many greetings occur?',
    },
    choices: {
      es: ['3', '2', '4', '6'],
      en: ['3', '2', '4', '6'],
    },
    answer: 0,
  },
  {
    id: 'q056',
    category: 'Lógica',
    prompt: {
      es: '¿Cuántas caras tiene un cubo?',
      en: 'How many faces does a cube have?',
    },
    choices: {
      es: ['6', '4', '8', '12'],
      en: ['6', '4', '8', '12'],
    },
    answer: 0,
  },
  {
    id: 'q057',
    category: 'Lógica',
    prompt: {
      es: 'Si hoy es lunes, ¿qué día será dentro de diez días?',
      en: 'If today is Monday, what day will it be in ten days?',
    },
    choices: {
      es: ['Jueves', 'Miércoles', 'Viernes', 'Sábado'],
      en: ['Thursday', 'Wednesday', 'Friday', 'Saturday'],
    },
    answer: 0,
  },
  {
    id: 'q058',
    category: 'Lógica',
    prompt: {
      es: '¿Cuál es el menor número primo?',
      en: 'What is the smallest prime number?',
    },
    choices: {
      es: ['2', '0', '1', '3'],
      en: ['2', '0', '1', '3'],
    },
    answer: 0,
  },
  {
    id: 'q059',
    category: 'Lógica',
    prompt: {
      es: '¿Cuántos grados tiene un ángulo recto?',
      en: 'How many degrees are in a right angle?',
    },
    choices: {
      es: ['90', '45', '180', '360'],
      en: ['90', '45', '180', '360'],
    },
    answer: 0,
  },
  {
    id: 'q060',
    category: 'Lógica',
    prompt: {
      es: 'Una cuerda mide dos metros. ¿Cuántos trozos de medio metro salen?',
      en: 'A rope is two metres long. How many half-metre pieces can it make?',
    },
    choices: {
      es: ['4', '2', '3', '8'],
      en: ['4', '2', '3', '8'],
    },
    answer: 0,
  },
  {
    id: 'q061',
    category: 'Vida cotidiana',
    prompt: {
      es: '¿Qué utensilio separa el líquido de los sólidos al escurrir pasta?',
      en: 'Which utensil separates liquid from solids when draining pasta?',
    },
    choices: {
      es: ['Colador', 'Mortero', 'Rallador', 'Batidor'],
      en: ['Colander', 'Mortar', 'Grater', 'Whisk'],
    },
    answer: 0,
  },
  {
    id: 'q062',
    category: 'Vida cotidiana',
    prompt: {
      es: '¿Qué ingrediente hace subir una masa mediante fermentación?',
      en: 'Which ingredient makes dough rise through fermentation?',
    },
    choices: {
      es: ['Levadura', 'Sal', 'Aceite', 'Agua fría'],
      en: ['Yeast', 'Salt', 'Oil', 'Cold water'],
    },
    answer: 0,
  },
  {
    id: 'q063',
    category: 'Vida cotidiana',
    prompt: {
      es: '¿Qué producto se obtiene al batir nata hasta separar la grasa?',
      en: 'What product is made by churning cream until its fat separates?',
    },
    choices: {
      es: ['Mantequilla', 'Harina', 'Vinagre', 'Miel'],
      en: ['Butter', 'Flour', 'Vinegar', 'Honey'],
    },
    answer: 0,
  },
  {
    id: 'q064',
    category: 'Vida cotidiana',
    prompt: {
      es: '¿Qué herramienta aprieta una tuerca hexagonal?',
      en: 'Which tool tightens a hexagonal nut?',
    },
    choices: {
      es: ['Llave', 'Serrucho', 'Lima', 'Punzón'],
      en: ['Spanner', 'Handsaw', 'File', 'Awl'],
    },
    answer: 0,
  },
  {
    id: 'q065',
    category: 'Vida cotidiana',
    prompt: {
      es: '¿Qué fibra natural procede del vellón de las ovejas?',
      en: 'Which natural fibre comes from sheep’s fleece?',
    },
    choices: {
      es: ['Lana', 'Lino', 'Seda', 'Algodón'],
      en: ['Wool', 'Linen', 'Silk', 'Cotton'],
    },
    answer: 0,
  },
  {
    id: 'q066',
    category: 'Vida cotidiana',
    prompt: {
      es: '¿Qué objeto orienta su aguja hacia el norte magnético?',
      en: 'Which object points its needle toward magnetic north?',
    },
    choices: {
      es: ['Brújula', 'Reloj de arena', 'Nivel', 'Regla'],
      en: ['Compass', 'Hourglass', 'Spirit level', 'Ruler'],
    },
    answer: 0,
  },
  {
    id: 'q067',
    category: 'Vida cotidiana',
    prompt: {
      es: '¿Qué proceso convierte la leche en yogur?',
      en: 'Which process turns milk into yoghurt?',
    },
    choices: {
      es: ['Fermentación', 'Destilación', 'Sublimación', 'Evaporación completa'],
      en: ['Fermentation', 'Distillation', 'Sublimation', 'Complete evaporation'],
    },
    answer: 0,
  },
  {
    id: 'q068',
    category: 'Vida cotidiana',
    prompt: {
      es: '¿Qué parte de una bicicleta transmite el giro de los pedales a la rueda trasera?',
      en: 'Which bicycle part transfers pedal rotation to the rear wheel?',
    },
    choices: {
      es: ['Cadena', 'Manillar', 'Sillín', 'Freno delantero'],
      en: ['Chain', 'Handlebar', 'Saddle', 'Front brake'],
    },
    answer: 0,
  },
  {
    id: 'q069',
    category: 'Vida cotidiana',
    prompt: {
      es: '¿Qué material deja pasar la luz con claridad?',
      en: 'Which material lets light pass through clearly?',
    },
    choices: {
      es: ['Vidrio transparente', 'Cartón', 'Madera', 'Acero'],
      en: ['Clear glass', 'Cardboard', 'Wood', 'Steel'],
    },
    answer: 0,
  },
  {
    id: 'q070',
    category: 'Vida cotidiana',
    prompt: {
      es: '¿Qué unidad suele indicar la capacidad de una botella de agua?',
      en: 'Which unit commonly states a water bottle’s capacity?',
    },
    choices: {
      es: ['Litro', 'Kilómetro', 'Grado', 'Vatio'],
      en: ['Litre', 'Kilometre', 'Degree', 'Watt'],
    },
    answer: 0,
  },
  {
    id: 'q071',
    category: 'Vida cotidiana',
    prompt: {
      es: '¿Qué herramienta permite medir un ángulo sobre papel?',
      en: 'Which tool measures an angle on paper?',
    },
    choices: {
      es: ['Transportador', 'Borrador', 'Grapadora', 'Tijeras'],
      en: ['Protractor', 'Eraser', 'Stapler', 'Scissors'],
    },
    answer: 0,
  },
  {
    id: 'q072',
    category: 'Vida cotidiana',
    prompt: {
      es: '¿Qué mecanismo transforma una puerta normal en una pieza que puede girar?',
      en: 'Which fitting allows an ordinary door to swing?',
    },
    choices: {
      es: ['Bisagra', 'Candado', 'Mirilla', 'Pomo fijo'],
      en: ['Hinge', 'Padlock', 'Peephole', 'Fixed knob'],
    },
    answer: 0,
  },
];
