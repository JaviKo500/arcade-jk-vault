import { notFound } from "next/navigation";
import { GamePlayer } from "@/components/game-player";
import { SignalLost } from "@/components/signal-lost";
import { getGame } from "@/lib/data/games";

export default async function GamePlayPage(
  props: PageProps<"/games/[id]/play">,
) {
  const { id } = await props.params;
  const result = await getGame(id);

  if (!result.ok) {
    return <SignalLost />;
  }

  const game = result.data;
  if (!game) {
    notFound();
  }

  return <GamePlayer game={game} />;
}
