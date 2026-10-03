-- Catálogo de juegos y puntuaciones (SPEC 06)

create table public.games (
  id                text primary key,
  title             text not null,
  short_description text not null,
  long_description  text not null,
  category          text not null check (category in ('ARCADE', 'PUZZLE', 'SHOOTER', 'VERSUS')),
  cover             text not null,
  accent_color      text not null check (accent_color in ('cyan', 'magenta', 'yellow', 'green')),
  sort_order        int  not null unique,
  created_at        timestamptz not null default now()
);

create table public.scores (
  id          bigint generated always as identity primary key,
  game_id     text not null references public.games (id),
  player_name text not null check (player_name ~ '^[A-Z0-9_]{1,12}$'),
  score       int  not null check (score between 0 and 10000000),
  created_at  timestamptz not null default now()
);

create index scores_game_score_idx on public.scores (game_id, score desc, created_at asc);

-- Mejor puntuación y nº de puntuaciones guardadas por juego (juegos sin puntuaciones: 0 y 0)
create view public.game_stats with (security_invoker = true) as
  select g.id as game_id,
         coalesce(max(s.score), 0) as best_score,
         count(s.id)::int          as play_count
  from public.games g
  left join public.scores s on s.game_id = g.id
  group by g.id;

-- Mejor marca de cada jugador por juego, con rango (empate: gana el created_at más antiguo)
create view public.leaderboard with (security_invoker = true) as
  with best as (
    select distinct on (game_id, player_name) game_id, player_name, score, created_at
    from public.scores
    order by game_id, player_name, score desc, created_at asc
  )
  select game_id,
         player_name,
         score,
         created_at,
         row_number() over (partition by game_id order by score desc, created_at asc)::int as rank
  from best;

-- RLS
alter table public.games  enable row level security;
alter table public.scores enable row level security;

create policy "games are readable"   on public.games  for select to anon, authenticated using (true);
create policy "scores are readable"  on public.scores for select to anon, authenticated using (true);
create policy "anyone can add score" on public.scores for insert to anon, authenticated with check (true);
-- Sin políticas de update/delete: quedan denegados. Los check de la tabla validan el formato.

grant select on public.games to anon, authenticated;
grant select, insert on public.scores to anon, authenticated;
grant select on public.game_stats, public.leaderboard to anon, authenticated;

-- Seed: los 9 juegos de data/games.ts, en el mismo orden
insert into public.games (id, title, short_description, long_description, category, cover, accent_color, sort_order) values
  (
    'asteroids',
    'ASTEROIDS',
    'Pilota tu nave y pulveriza el campo de asteroides.',
    'Una nave solitaria flota en un campo de asteroides donde el espacio no tiene bordes: lo que sale por un lado entra por el opuesto. Gira, propulsa y dispara para partir las rocas grandes en medianas y las medianas en pequeñas. Tienes 3 vidas con invencibilidad temporal al reaparecer, y cada nivel trae más asteroides. Atrapa el disparo triple y sube en la tabla.',
    'SHOOTER',
    'cover-asteroids',
    'cyan',
    1
  ),
  (
    'bloque-buster',
    'BLOQUE BUSTER',
    'Rebota la pelota y destruye muros de neón.',
    'Pilota una nave-paleta y rebota un núcleo de plasma para pulverizar muros de bloques cromáticos. Cada nivel reorganiza la grilla en patrones imposibles. ¿Hasta dónde llegará tu racha?',
    'ARCADE',
    'cover-bricks',
    'cyan',
    2
  ),
  (
    'caida',
    'CAÍDA',
    'Encaja las piezas antes de que el techo te aplaste.',
    'Piezas geométricas descienden desde la oscuridad. Rótalas, encástralas y limpia líneas para sobrevivir. La velocidad aumenta sin piedad cada 10 líneas.',
    'PUZZLE',
    'cover-tetro',
    'magenta',
    3
  ),
  (
    'serpentina',
    'SERPENTINA',
    'Crece sin morder tu propia cola.',
    'Una serpiente de luz recorre la grilla buscando núcleos magenta. Cada bocado la alarga y la hace más veloz. Un movimiento en falso y se devora a sí misma.',
    'ARCADE',
    'cover-snake',
    'green',
    4
  ),
  (
    'gloton',
    'GLOTÓN',
    'Devora puntos y escapa de los fantasmas.',
    'Un círculo glotón patrulla un laberinto coleccionando puntos luminosos. Cuatro espectros lo persiguen, pero cada cierto tiempo aparece una píldora que invierte los papeles.',
    'ARCADE',
    'cover-glot',
    'yellow',
    5
  ),
  (
    'invasores',
    'INVASORES',
    'Defiende el planeta de filas alienígenas.',
    'Olas de pixeles hostiles descienden formación tras formación. Mueve tu cañón en horizontal y abre fuego con precisión, antes de que toquen la superficie.',
    'SHOOTER',
    'cover-invaders',
    'green',
    6
  ),
  (
    'rocas',
    'ROCAS',
    'Pulveriza asteroides en gravedad cero.',
    'Tu nave triangular flota en vacío absoluto. Dispara y rota para dividir rocas en fragmentos cada vez más pequeños. Cuidado con los OVNIs en el horizonte.',
    'SHOOTER',
    'cover-rocas',
    'yellow',
    7
  ),
  (
    'ranaria',
    'RANARIA',
    'Cruza la autopista de pixeles.',
    'Salta entre carriles de coches a toda velocidad y troncos a la deriva en el río. Llega a los nenúfares antes de que se acabe el tiempo.',
    'ARCADE',
    'cover-rana',
    'green',
    8
  ),
  (
    'duelo-pixel',
    'DUELO PIXEL',
    'Dos paletas. Una pelota. Reflejos máximos.',
    'El duelo más puro: dos paletas verticales se enfrentan por rebotar una pelota luminosa. Modo solitario contra la CPU o partida local a dos jugadores.',
    'VERSUS',
    'cover-duelo',
    'cyan',
    9
  );
