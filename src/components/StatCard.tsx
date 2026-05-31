type StatCardProps = {
  label: string;
  value: string;
};

function StatCard({ label, value }: StatCardProps) {
  return (
    <article className="rounded-2xl border border-white/10 bg-[#0b1b2f] p-5">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-2 text-4xl font-black text-[#C6FF00]">{value}</p>
    </article>
  );
}

export default StatCard;