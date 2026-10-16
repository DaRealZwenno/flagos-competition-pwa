import AppVersionCard from "../components/AppVersionCard";
import { PageTitle } from "../components/ui";

export default function SettingsPage() {
  return (
    <>
      <PageTitle title="Einstellungen" sub="Version und Updates. Weitere Einstellungen (z. B. Spielart, Punktesystem pro Competition) kommen mit den Modulen." />
      <div className="max-w-2xl">
        <AppVersionCard />
      </div>
    </>
  );
}
