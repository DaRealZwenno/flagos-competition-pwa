// Paarung in der Anzeigereihenfolge: Gast links, Heim rechts (wie im Broadcast Studio), dazwischen „vs.“ in hellerem Grau
import type { Competition, CompetitionGame } from "../types/competition";
import { teamName } from "../lib/format";
import { refLabel } from "../lib/schedule/plan";

/** Teamname, sonst Platzhalter aus dem Plan („1. Gruppe A“, „Sieger HF 1“), sonst „offen“ */
const side = (c: Competition, id?: string, ref?: string) =>
  id ? teamName(c, id) : ref ? refLabel(ref) : "offen";

export default function Matchup({ c, g }: { c: Competition; g: CompetitionGame }) {
  return (
    <>
      {side(c, g.awayTeamId, g.awayRef)} <span className="font-normal text-slate-500">vs.</span> {side(c, g.homeTeamId, g.homeRef)}
    </>
  );
}
