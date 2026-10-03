"use client";

import { useEffect, useState } from "react";
import { useSession } from "@/components/session-provider";
import { getPlayerBest } from "@/lib/data/scores-client";
import type { LeaderboardEntry } from "@/lib/data/types";
import { normalizePlayerName } from "@/lib/format";

type Lookup = { key: string; entry: LeaderboardEntry | null };

// "TU MEJOR MARCA": the session player's best score and real rank in a game,
// even outside the visible top. Renders nothing without session, score or data.
export function PlayerBestRow({
  gameId,
  gameTitle,
  animationDelay,
}: {
  gameId: string;
  gameTitle: string;
  animationDelay: number;
}) {
  const { session } = useSession();
  // Scores are stored with the normalized name, so look it up the same way.
  const playerName = session ? normalizePlayerName(session.name) : null;
  const key = `${gameId}|${playerName}`;
  const [lookup, setLookup] = useState<Lookup | null>(null);

  useEffect(() => {
    if (!playerName) return;
    let cancelled = false;

    getPlayerBest(gameId, playerName).then((result) => {
      if (!cancelled) {
        setLookup({ key, entry: result.ok ? result.data : null });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [gameId, playerName, key]);

  // Ignore a lookup left over from another tab or player.
  const entry = playerName && lookup?.key === key ? lookup.entry : null;
  if (!entry) return null;

  return (
    <>
      <div className="tr you-label">▸ TU MEJOR MARCA EN {gameTitle}</div>
      <div className="tr you" style={{ animationDelay: `${animationDelay}ms` }}>
        <div className="rk" style={{ color: "var(--yellow)" }}>
          #{String(entry.rank).padStart(2, "0")}
        </div>
        <div className="pl" style={{ color: "var(--yellow)" }}>
          {entry.playerName}
        </div>
        <div
          className="sc"
          style={{
            color: "var(--yellow)",
            textShadow: "0 0 6px rgba(245,255,0,0.5)",
          }}
        >
          {entry.score.toLocaleString("es-ES")}
        </div>
        <div className="dt">{entry.date}</div>
      </div>
    </>
  );
}
