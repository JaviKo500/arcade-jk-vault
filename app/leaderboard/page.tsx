import Link from "next/link";
import { BeTheFirst } from "@/components/be-the-first";
import { SignalLost } from "@/components/signal-lost";
import { getGames } from "@/lib/data/games";
import { getLeaderboard } from "@/lib/data/leaderboard";
import type { LeaderboardEntry } from "@/lib/data/types";

const TOP_LIMIT = 12;

export default async function LeaderboardPage(
  props: PageProps<"/leaderboard">,
) {
  const [games, { game: requested }] = await Promise.all([
    getGames(),
    props.searchParams,
  ]);

  if (!games.ok || games.data.length === 0) {
    return <SignalLost />;
  }

  // Missing or unknown ?game= falls back to the first game by sort_order.
  const game = games.data.find((g) => g.id === requested) ?? games.data[0];
  const rows = await getLeaderboard(game.id, TOP_LIMIT);

  return (
    <div className="av-hall fade-in">
      <div className="hall-head">
        <h1>SALÓN DE LA FAMA</h1>
        <p className="pixel" style={{ fontSize: 10 }}>
          LOS NOMBRES QUE NUNCA SE BORRAN DE LA PANTALLA
        </p>
      </div>

      <nav className="hall-tabs" aria-label="Juegos">
        {games.data.map((g) => (
          <Link
            key={g.id}
            href={`/leaderboard?game=${g.id}`}
            className={`chip${g.id === game.id ? " active" : ""}`}
            aria-current={g.id === game.id ? "page" : undefined}
          >
            {g.title}
          </Link>
        ))}
      </nav>

      {!rows.ok ? (
        <SignalLost variant="block" />
      ) : rows.data.length === 0 ? (
        <div className="hall-table">
          <BeTheFirst gameId={game.id} />
        </div>
      ) : (
        <>
          <Podium rows={rows.data} />

          <div className="hall-table">
            <div className="th">
              <div>RANGO</div>
              <div>JUGADOR</div>
              <div>PUNTUACIÓN</div>
              <div>FECHA</div>
            </div>
            {rows.data.map((r, i) => (
              <div
                key={r.playerName}
                className={`tr${
                  i === 0 ? " top1" : i === 1 ? " top2" : i === 2 ? " top3" : ""
                }`}
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className="rk">#{String(r.rank).padStart(2, "0")}</div>
                <div className="pl">{r.playerName}</div>
                <div className="sc">{r.score.toLocaleString("es-ES")}</div>
                <div className="dt">{r.date}</div>
              </div>
            ))}
          </div>
        </>
      )}

      <div style={{ textAlign: "center", marginTop: 32 }}>
        <Link href="/games" className="btn lg">
          VOLVER A LA BIBLIOTECA
        </Link>
      </div>
    </div>
  );
}

// Only existing places are rendered; an empty spacer keeps gold centered.
function Podium({ rows }: { rows: LeaderboardEntry[] }) {
  const [first, second, third] = rows;

  return (
    <div className="podium">
      {second ? (
        <div className="podium-slot silver">
          <div className="rank-num">02</div>
          <div className="name">{second.playerName}</div>
          <div className="score">{second.score.toLocaleString("es-ES")}</div>
          <div className="date">{second.date}</div>
        </div>
      ) : (
        <div className="podium-spacer" aria-hidden="true" />
      )}
      <div className="podium-slot gold">
        <div
          className="pixel"
          style={{ fontSize: 9, color: "var(--gold)", letterSpacing: "0.18em" }}
        >
          CAMPEÓN
        </div>
        <div className="rank-num" style={{ fontSize: 36, marginTop: 4 }}>
          01
        </div>
        <div className="name">{first.playerName}</div>
        <div className="score" style={{ fontSize: 20 }}>
          {first.score.toLocaleString("es-ES")}
        </div>
        <div className="date">{first.date}</div>
      </div>
      {third && (
        <div className="podium-slot bronze">
          <div className="rank-num">03</div>
          <div className="name">{third.playerName}</div>
          <div className="score">{third.score.toLocaleString("es-ES")}</div>
          <div className="date">{third.date}</div>
        </div>
      )}
    </div>
  );
}
