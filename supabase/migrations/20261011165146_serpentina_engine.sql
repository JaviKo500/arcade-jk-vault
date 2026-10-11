-- SPEC 09: SERPENTINA gets a real engine. Only the catalog texts change.
-- Fila actual: id = 'serpentina', title = 'SERPENTINA', category = 'ARCADE', cover = 'cover-snake',
-- accent_color = 'green', sort_order = 4
update public.games
set short_description = 'Come frutas, crece y no muerdas tu cola.',
    long_description  = 'Una serpiente de luz recorre una grilla de neón devorando frutas pixeladas. Cada bocado la alarga y suma puntos, y cada cinco frutas sube el nivel y la serpiente acelera. Tienes 3 vidas: chocar con una pared o con tu propia cola te cuesta una. ¿Hasta dónde llegará tu racha?'
where id = 'serpentina';
