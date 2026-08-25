"use client";

import { useMemo, useState } from "react";
import { CATEGORY_FILTERS, GAMES } from "@/data/games";
import { GameCard } from "@/components/game-card";

export default function GamesPage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] =
    useState<(typeof CATEGORY_FILTERS)[number]>("TODOS");

  const filtered = useMemo(() => {
    return GAMES.filter(
      (game) =>
        (category === "TODOS" || game.category === category) &&
        game.title.toLowerCase().includes(query.toLowerCase()),
    );
  }, [query, category]);

  return (
    <div className="fade-in">
      <section className="av-hero">
        <h1 className="flicker">ARCADE VAULT</h1>
        <div className="sub">
          INSERTA UNA MONEDA PARA JUGAR <span className="blink">_</span>
        </div>
      </section>

      <div className="av-filters">
        <div className="av-search">
          <span className="ico">⌕</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar un juego por nombre…"
          />
        </div>
        <div className="av-chips">
          {CATEGORY_FILTERS.map((c) => (
            <button
              key={c}
              className={`chip${category === c ? " active" : ""}`}
              onClick={() => setCategory(c)}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="av-grid">
        {filtered.map((game) => (
          <GameCard key={game.id} game={game} />
        ))}
        {filtered.length === 0 && (
          <div
            style={{
              gridColumn: "1 / -1",
              textAlign: "center",
              padding: 80,
              color: "var(--ink-faint)",
            }}
          >
            <div
              className="pixel"
              style={{
                fontSize: 14,
                color: "var(--magenta)",
                marginBottom: 12,
              }}
            >
              NO HAY RESULTADOS
            </div>
            <div>Intenta otra búsqueda o categoría.</div>
          </div>
        )}
      </div>
    </div>
  );
}
