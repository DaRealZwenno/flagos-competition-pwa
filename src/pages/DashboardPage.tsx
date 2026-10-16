import StatCard from "../components/StatCard";
import { Card, PageTitle, Tag } from "../components/ui";

const competitionStats = [
  { label: "Teams", value: "8" },
  { label: "Gruppen", value: "2" },
  { label: "Felder", value: "2" },
  { label: "Spiele", value: "24" },
];

function DashboardPage() {
  return (
    <>
      <PageTitle
        title="Dashboard"
        sub="Status auf einen Blick, für Turnier und Spieltag. Grundlage für Spielplan, Ergebniserfassung, Tabellen und öffentliche Anzeigen. Aktuell noch mit lokalen Dummy-Daten."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {competitionStats.map((item) => (
          <StatCard key={item.label} label={item.label} value={item.value} />
        ))}
      </div>

      <Card className="mt-6" title="MVP-Fokus" actions={<Tag tone="accent">Stufe 1</Tag>}>
        <p className="text-sm text-slate-300">
          Als Nächstes zeigt Competition echte Daten: Competitions, Spielplan, Ergebnisse und Tabellen
          (zunächst nur lesen), ersetzt die Dummy-Zahlen und aktualisiert sich live.
        </p>
      </Card>
    </>
  );
}

export default DashboardPage;
