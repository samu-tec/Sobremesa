import { BoardTile, CardEffect, PropertyGroup } from './types.js';

export const PROPERTY_GROUPS: Record<PropertyGroup, number[]> = {
  brown: [1, 3],
  light_blue: [6, 8, 9],
  pink: [11, 13, 14],
  orange: [16, 18, 19],
  red: [21, 23, 24],
  yellow: [26, 27, 29],
  green: [31, 32, 34],
  dark_blue: [37, 39],
  station: [5, 15, 25, 35],
  utility: [12, 28],
};

export const BOARD_TILES: BoardTile[] = [
  // 0
  { index: 0, name: 'SALIDA (GO)', type: 'go' },
  // 1
  {
    index: 1,
    name: 'Ronda de Valencia',
    type: 'property',
    group: 'brown',
    price: 60,
    rent: [2, 10, 30, 90, 160, 250],
    houseCost: 50,
    mortgageValue: 30,
  },
  // 2
  { index: 2, name: 'Caja de Comunidad', type: 'community_chest' },
  // 3
  {
    index: 3,
    name: 'Plaza de Lavapiés',
    type: 'property',
    group: 'brown',
    price: 60,
    rent: [4, 20, 60, 180, 320, 450],
    houseCost: 50,
    mortgageValue: 30,
  },
  // 4
  { index: 4, name: 'Impuesto de Capital', type: 'tax', taxAmount: 200 },
  // 5
  {
    index: 5,
    name: 'Estación de Goya',
    type: 'station',
    group: 'station',
    price: 200,
    rent: [25, 50, 100, 200],
    mortgageValue: 100,
  },
  // 6
  {
    index: 6,
    name: 'Cuatro Caminos',
    type: 'property',
    group: 'light_blue',
    price: 100,
    rent: [6, 30, 90, 270, 400, 550],
    houseCost: 50,
    mortgageValue: 50,
  },
  // 7
  { index: 7, name: 'Suerte', type: 'chance' },
  // 8
  {
    index: 8,
    name: 'Reina Victoria',
    type: 'property',
    group: 'light_blue',
    price: 100,
    rent: [6, 30, 90, 270, 400, 550],
    houseCost: 50,
    mortgageValue: 50,
  },
  // 9
  {
    index: 9,
    name: 'Bravo Murillo',
    type: 'property',
    group: 'light_blue',
    price: 120,
    rent: [8, 40, 100, 300, 450, 600],
    houseCost: 50,
    mortgageValue: 60,
  },
  // 10
  { index: 10, name: 'Cárcel / De Visita', type: 'jail' },
  // 11
  {
    index: 11,
    name: 'Glorieta de Bilbao',
    type: 'property',
    group: 'pink',
    price: 140,
    rent: [10, 50, 150, 450, 625, 750],
    houseCost: 100,
    mortgageValue: 70,
  },
  // 12
  {
    index: 12,
    name: 'Compañía Eléctrica',
    type: 'utility',
    group: 'utility',
    price: 150,
    mortgageValue: 75,
  },
  // 13
  {
    index: 13,
    name: 'Alberto Aguilera',
    type: 'property',
    group: 'pink',
    price: 140,
    rent: [10, 50, 150, 450, 625, 750],
    houseCost: 100,
    mortgageValue: 70,
  },
  // 14
  {
    index: 14,
    name: 'Calle Fuencarral',
    type: 'property',
    group: 'pink',
    price: 160,
    rent: [12, 60, 180, 500, 700, 900],
    houseCost: 100,
    mortgageValue: 80,
  },
  // 15
  {
    index: 15,
    name: 'Estación de Delicias',
    type: 'station',
    group: 'station',
    price: 200,
    rent: [25, 50, 100, 200],
    mortgageValue: 100,
  },
  // 16
  {
    index: 16,
    name: 'Plaza de España',
    type: 'property',
    group: 'orange',
    price: 180,
    rent: [14, 70, 200, 550, 750, 950],
    houseCost: 100,
    mortgageValue: 90,
  },
  // 17
  { index: 17, name: 'Caja de Comunidad', type: 'community_chest' },
  // 18
  {
    index: 18,
    name: 'Gran Vía',
    type: 'property',
    group: 'orange',
    price: 180,
    rent: [14, 70, 200, 550, 750, 950],
    houseCost: 100,
    mortgageValue: 90,
  },
  // 19
  {
    index: 19,
    name: 'Calle de Alcalá',
    type: 'property',
    group: 'orange',
    price: 200,
    rent: [16, 80, 220, 600, 800, 1000],
    houseCost: 100,
    mortgageValue: 100,
  },
  // 20
  { index: 20, name: 'Parking Gratuito', type: 'free_parking' },
  // 21
  {
    index: 21,
    name: 'Plaza del Callao',
    type: 'property',
    group: 'red',
    price: 220,
    rent: [18, 90, 250, 700, 875, 1050],
    houseCost: 150,
    mortgageValue: 110,
  },
  // 22
  { index: 22, name: 'Suerte', type: 'chance' },
  // 23
  {
    index: 23,
    name: 'Puerta del Sol',
    type: 'property',
    group: 'red',
    price: 220,
    rent: [18, 90, 250, 700, 875, 1050],
    houseCost: 150,
    mortgageValue: 110,
  },
  // 24
  {
    index: 24,
    name: 'Plaza Mayor',
    type: 'property',
    group: 'red',
    price: 240,
    rent: [20, 100, 300, 750, 925, 1100],
    houseCost: 150,
    mortgageValue: 120,
  },
  // 25
  {
    index: 25,
    name: 'Estación del Norte',
    type: 'station',
    group: 'station',
    price: 200,
    rent: [25, 50, 100, 200],
    mortgageValue: 100,
  },
  // 26
  {
    index: 26,
    name: 'Calle Velázquez',
    type: 'property',
    group: 'yellow',
    price: 260,
    rent: [22, 110, 330, 800, 975, 1150],
    houseCost: 150,
    mortgageValue: 130,
  },
  // 27
  {
    index: 27,
    name: 'Calle Serrano',
    type: 'property',
    group: 'yellow',
    price: 260,
    rent: [22, 110, 330, 800, 975, 1150],
    houseCost: 150,
    mortgageValue: 130,
  },
  // 28
  {
    index: 28,
    name: 'Compañía de Aguas',
    type: 'utility',
    group: 'utility',
    price: 150,
    mortgageValue: 75,
  },
  // 29
  {
    index: 29,
    name: 'Paseo Castellana',
    type: 'property',
    group: 'yellow',
    price: 280,
    rent: [24, 120, 360, 850, 1025, 1200],
    houseCost: 150,
    mortgageValue: 140,
  },
  // 30
  { index: 30, name: 'Ve a la Cárcel', type: 'go_to_jail' },
  // 31
  {
    index: 31,
    name: 'Paseo de Recoletos',
    type: 'property',
    group: 'green',
    price: 300,
    rent: [26, 130, 390, 900, 1100, 1275],
    houseCost: 200,
    mortgageValue: 150,
  },
  // 32
  {
    index: 32,
    name: 'Paseo del Prado',
    type: 'property',
    group: 'green',
    price: 300,
    rent: [26, 130, 390, 900, 1100, 1275],
    houseCost: 200,
    mortgageValue: 150,
  },
  // 33
  { index: 33, name: 'Caja de Comunidad', type: 'community_chest' },
  // 34
  {
    index: 34,
    name: 'Plaza de Cibeles',
    type: 'property',
    group: 'green',
    price: 320,
    rent: [28, 150, 450, 1000, 1200, 1400],
    houseCost: 200,
    mortgageValue: 160,
  },
  // 35
  {
    index: 35,
    name: 'Estación Chamartín',
    type: 'station',
    group: 'station',
    price: 200,
    rent: [25, 50, 100, 200],
    mortgageValue: 100,
  },
  // 36
  { index: 36, name: 'Suerte', type: 'chance' },
  // 37
  {
    index: 37,
    name: 'Paseo de la Habana',
    type: 'property',
    group: 'dark_blue',
    price: 350,
    rent: [35, 175, 500, 1100, 1300, 1500],
    houseCost: 200,
    mortgageValue: 175,
  },
  // 38
  { index: 38, name: 'Tasa de Lujo', type: 'tax', taxAmount: 100 },
  // 39
  {
    index: 39,
    name: 'Puerta de Alcalá',
    type: 'property',
    group: 'dark_blue',
    price: 400,
    rent: [50, 200, 600, 1400, 1700, 2000],
    houseCost: 200,
    mortgageValue: 200,
  },
];

export const CHANCE_CARDS: CardEffect[] = [
  { id: 'ch_1', deck: 'chance', text: '¡Avanza hasta la SALIDA! Cobra tu sueldo.', type: 'move', targetTile: 0 },
  { id: 'ch_2', deck: 'chance', text: 'Avanza hasta la Puerta de Alcalá.', type: 'move', targetTile: 39 },
  { id: 'ch_3', deck: 'chance', text: 'Ve directamente a la Cárcel sin pasar por la SALIDA.', type: 'jail' },
  { id: 'ch_4', deck: 'chance', text: 'El banco te paga un dividendo de 50€.', type: 'money', value: 50 },
  { id: 'ch_5', deck: 'chance', text: 'Multa por exceso de velocidad: paga 15€.', type: 'money', value: -15 },
  { id: 'ch_6', deck: 'chance', text: 'Avanza hasta la estación más cercana (Goya).', type: 'move', targetTile: 5 },
  { id: 'ch_7', deck: 'chance', text: 'Carta de Libertad: Sal gratis de la Cárcel.', type: 'jail_free' },
  { id: 'ch_8', deck: 'chance', text: 'Has sido elegido presidente de la junta: paga 50€ a cada jugador.', type: 'pay_players', value: 50 },
  { id: 'ch_9', deck: 'chance', text: 'Tu préstamo de construcción vence: cobra 150€.', type: 'money', value: 150 },
  { id: 'ch_10', deck: 'chance', text: 'Reparaciones generales en tus fincas: paga 25€ por casa y 100€ por hotel.', type: 'repairs' },
];

export const COMMUNITY_CHEST_CARDS: CardEffect[] = [
  { id: 'cc_1', deck: 'community_chest', text: 'Error de la banca a tu favor: cobra 200€.', type: 'money', value: 200 },
  { id: 'cc_2', deck: 'community_chest', text: 'Honorarios del médico: paga 50€.', type: 'money', value: -50 },
  { id: 'cc_3', deck: 'community_chest', text: 'Venta de tus acciones: recibes 100€.', type: 'money', value: 100 },
  { id: 'cc_4', deck: 'community_chest', text: 'Ve a la Cárcel directamente.', type: 'jail' },
  { id: 'cc_5', deck: 'community_chest', text: 'Carta de Libertad: Sal gratis de la Cárcel.', type: 'jail_free' },
  { id: 'cc_6', deck: 'community_chest', text: 'Devolución de Hacienda: cobra 20€.', type: 'money', value: 20 },
  { id: 'cc_7', deck: 'community_chest', text: 'Es tu cumpleaños: recibe 10€ de cada jugador.', type: 'pay_players', value: -10 },
  { id: 'cc_8', deck: 'community_chest', text: 'Paga la factura del hospital de 100€.', type: 'money', value: -100 },
  { id: 'cc_9', deck: 'community_chest', text: 'Heredas 100€ de un pariente lejano.', type: 'money', value: 100 },
  { id: 'cc_10', deck: 'community_chest', text: 'Avanza hasta la SALIDA y cobra tu sueldo.', type: 'move', targetTile: 0 },
];
