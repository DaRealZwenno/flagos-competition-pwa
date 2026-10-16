import { Card, PageTitle, Tag } from "../components/ui";

type PlaceholderPageProps = {
  title: string;
  description: string;
};

function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <>
      <PageTitle title={title} sub={description} />
      <Card title="Status" actions={<Tag tone="muted">in Vorbereitung</Tag>}>
        <p className="text-sm text-slate-400">
          Dieses Modul ist als Navigation bereits vorbereitet und wird in einem
          späteren Schritt mit echten Daten und Funktionen gefüllt.
        </p>
      </Card>
    </>
  );
}

export default PlaceholderPage;
