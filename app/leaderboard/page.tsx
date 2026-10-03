import { LeaderboardView } from "@/components/leaderboard-view";
import { SignalLost } from "@/components/signal-lost";
import { getGames } from "@/lib/data/games";

export default async function LeaderboardPage() {
  const games = await getGames();

  if (!games.ok || games.data.length === 0) {
    return <SignalLost />;
  }

  return <LeaderboardView games={games.data} />;
}
