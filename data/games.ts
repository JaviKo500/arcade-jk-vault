export type GameCategory = "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";

export type Game = {
  id: string;
  title: string;
  shortDescription: string;
  longDescription: string;
  category: GameCategory;
  cover: string;
  accentColor: "cyan" | "magenta" | "yellow" | "green";
  bestScore: number;
  playCount: string;
};

export const GAMES: Game[] = [
  {
    id: "bloque-buster",
    title: "BLOQUE BUSTER",
    shortDescription: "Rebota la pelota y destruye muros de neón.",
    longDescription:
      "Pilota una nave-paleta y rebota un núcleo de plasma para pulverizar muros de bloques cromáticos. Cada nivel reorganiza la grilla en patrones imposibles. ¿Hasta dónde llegará tu racha?",
    category: "ARCADE",
    cover: "cover-bricks",
    accentColor: "cyan",
    bestScore: 28450,
    playCount: "12.4K",
  },
  {
    id: "caida",
    title: "CAÍDA",
    shortDescription: "Encaja las piezas antes de que el techo te aplaste.",
    longDescription:
      "Piezas geométricas descienden desde la oscuridad. Rótalas, encástralas y limpia líneas para sobrevivir. La velocidad aumenta sin piedad cada 10 líneas.",
    category: "PUZZLE",
    cover: "cover-tetro",
    accentColor: "magenta",
    bestScore: 184220,
    playCount: "31.8K",
  },
  {
    id: "serpentina",
    title: "SERPENTINA",
    shortDescription: "Crece sin morder tu propia cola.",
    longDescription:
      "Una serpiente de luz recorre la grilla buscando núcleos magenta. Cada bocado la alarga y la hace más veloz. Un movimiento en falso y se devora a sí misma.",
    category: "ARCADE",
    cover: "cover-snake",
    accentColor: "green",
    bestScore: 7820,
    playCount: "9.1K",
  },
  {
    id: "gloton",
    title: "GLOTÓN",
    shortDescription: "Devora puntos y escapa de los fantasmas.",
    longDescription:
      "Un círculo glotón patrulla un laberinto coleccionando puntos luminosos. Cuatro espectros lo persiguen, pero cada cierto tiempo aparece una píldora que invierte los papeles.",
    category: "ARCADE",
    cover: "cover-glot",
    accentColor: "yellow",
    bestScore: 96400,
    playCount: "27.2K",
  },
  {
    id: "invasores",
    title: "INVASORES",
    shortDescription: "Defiende el planeta de filas alienígenas.",
    longDescription:
      "Olas de pixeles hostiles descienden formación tras formación. Mueve tu cañón en horizontal y abre fuego con precisión, antes de que toquen la superficie.",
    category: "SHOOTER",
    cover: "cover-invaders",
    accentColor: "green",
    bestScore: 54190,
    playCount: "18.0K",
  },
  {
    id: "rocas",
    title: "ROCAS",
    shortDescription: "Pulveriza asteroides en gravedad cero.",
    longDescription:
      "Tu nave triangular flota en vacío absoluto. Dispara y rota para dividir rocas en fragmentos cada vez más pequeños. Cuidado con los OVNIs en el horizonte.",
    category: "SHOOTER",
    cover: "cover-rocas",
    accentColor: "yellow",
    bestScore: 41200,
    playCount: "15.6K",
  },
  {
    id: "ranaria",
    title: "RANARIA",
    shortDescription: "Cruza la autopista de pixeles.",
    longDescription:
      "Salta entre carriles de coches a toda velocidad y troncos a la deriva en el río. Llega a los nenúfares antes de que se acabe el tiempo.",
    category: "ARCADE",
    cover: "cover-rana",
    accentColor: "green",
    bestScore: 18900,
    playCount: "6.4K",
  },
  {
    id: "duelo-pixel",
    title: "DUELO PIXEL",
    shortDescription: "Dos paletas. Una pelota. Reflejos máximos.",
    longDescription:
      "El duelo más puro: dos paletas verticales se enfrentan por rebotar una pelota luminosa. Modo solitario contra la CPU o partida local a dos jugadores.",
    category: "VERSUS",
    cover: "cover-duelo",
    accentColor: "cyan",
    bestScore: 24,
    playCount: "4.2K",
  },
];

export const CATEGORY_FILTERS = [
  "TODOS",
  "ARCADE",
  "PUZZLE",
  "SHOOTER",
  "VERSUS",
] as const;
