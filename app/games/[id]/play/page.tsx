import { notFound } from "next/navigation";
import { GAMES } from "@/data/games";
import { GamePlayer } from "@/components/game-player";

export default async function GamePlayPage(
  props: PageProps<"/games/[id]/play">,
) {
  const { id } = await props.params;
  const game = GAMES.find((g) => g.id === id);

  if (!game) {
    notFound();
  }

  return <GamePlayer game={game} />;
}
