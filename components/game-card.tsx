"use client";

import { useRef, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import type { Game } from "@/data/games";
import { formatPlayCount } from "@/lib/format";

const ACCENT_BUTTON_CLASS: Record<Game["accentColor"], string> = {
  cyan: "",
  magenta: "magenta",
  yellow: "yellow",
  green: "",
};

export function GameCard({ game }: { game: Game }) {
  const tiltRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const goToGame = () => router.push(`/games/${game.id}`);

  const onMove = (event: MouseEvent<HTMLDivElement>) => {
    const el = tiltRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width - 0.5;
    const py = (event.clientY - rect.top) / rect.height - 0.5;
    el.style.transform = `translateY(-6px) rotateX(${-py * 6}deg) rotateY(${px * 8}deg)`;
  };

  const onLeave = () => {
    const el = tiltRef.current;
    if (!el) return;
    el.style.transform = "";
  };

  return (
    <div
      ref={tiltRef}
      className="card"
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      onClick={goToGame}
    >
      <div className="cover">
        <div className={`cover-bg ${game.cover}`} />
        <div className="label">{game.category}</div>
      </div>
      <div className="meta">
        <div className="title">{game.title}</div>
        <div className="desc">{game.shortDescription}</div>
        <div className="row">
          <div className="score-stats">
            <div className="score-badge">
              <span>MEJOR PUNTUACIÓN</span>
              <b>{game.bestScore.toLocaleString("es-ES")}</b>
            </div>
            <div className="score-badge plays">
              <span>PARTIDAS</span>
              <b>{formatPlayCount(game.playCount)}</b>
            </div>
          </div>
          <button
            className={`btn ${ACCENT_BUTTON_CLASS[game.accentColor]}`}
            onClick={(event) => {
              event.stopPropagation();
              goToGame();
            }}
          >
            JUGAR
          </button>
        </div>
      </div>
    </div>
  );
}
