// Paarung in der Anzeigereihenfolge: Gast links, Heim rechts (wie im Broadcast Studio), dazwischen „vs.“ in hellerem Grau
import type { Competition, CompetitionGame } from "../types/competition";
import { teamName } from "../lib/format";

export default function Matchup({ c, g }: { c: Competition; g: CompetitionGame }) {
  return (
    <>
      {teamName(c, g.awayTeamId)} <span className="font-normal text-slate-500">vs.</span> {teamName(c, g.homeTeamId)}
    </>
  );
}
