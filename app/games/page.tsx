import { GamesBrowser } from "@/components/games-browser";
import { SignalLost } from "@/components/signal-lost";
import { getGames } from "@/lib/data/games";

export default async function GamesPage() {
  const games = await getGames();

  return (
    <div className="fade-in">
      <section className="av-hero">
        <h1 className="flicker">ARCADE VAULT</h1>
        <div className="sub">
          INSERTA UNA MONEDA PARA JUGAR <span className="blink">_</span>
        </div>
      </section>

      {games.ok ? <GamesBrowser games={games.data} /> : <SignalLost />}
    </div>
  );
}
