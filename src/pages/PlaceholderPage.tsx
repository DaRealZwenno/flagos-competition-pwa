type PlaceholderPageProps = {
  title: string;
  description: string;
};

function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/20 sm:p-8">
      <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#C6FF00]">
        Modul
      </p>

      <h2 className="mt-3 text-2xl font-black sm:text-4xl">{title}</h2>

      <p className="mt-3 max-w-2xl text-slate-300">{description}</p>

      <div className="mt-8 rounded-2xl border border-white/10 bg-[#0b1b2f] p-5">
        <p className="text-sm font-semibold text-slate-300">Status</p>
        <p className="mt-2 text-slate-400">
          Dieses Modul ist als Navigation bereits vorbereitet und wird in einem
          späteren Schritt mit echten Dummy-Daten und Funktionen gefüllt.
        </p>
      </div>
    </div>
  );
}

export default PlaceholderPage;