import Link from "next/link";

const VACANT_SLOTS = ["gold", "silver", "bronze"] as const;

// Empty state for a game without saved scores: vacant podium slots + a CTA.
export function BeTheFirst({ gameId }: { gameId: string }) {
  return (
    <div className="be-first">
      <div className="bf-slots" aria-hidden="true">
        {VACANT_SLOTS.map((slot, i) => (
          <div key={slot} className={`bf-slot ${slot}`}>
            <span className="rk">#{String(i + 1).padStart(2, "0")}</span>
            <span className="pl">- - - - - -</span>
            <span className="sc">000000</span>
          </div>
        ))}
      </div>
      <div className="bf-title pixel">
        SÉ EL PRIMERO<span className="blink">_</span>
      </div>
      <p className="bf-copy">
        Nadie ha guardado una puntuación en este juego todavía. El primer nombre
        de la tabla puede ser el tuyo.
      </p>
      <Link href={`/games/${gameId}/play`} className="btn">
        ▶ JUGAR AHORA
      </Link>
    </div>
  );
}
