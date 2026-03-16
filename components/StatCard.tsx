interface StatCardProps {
  label: string;
  value: string | number;
}

export default function StatCard({ label, value }: StatCardProps) {
  return (
    <div className="rounded-xl border border-bg-border bg-bg-card p-5 flex flex-col items-center sm:items-start text-center sm:text-left transition-colors hover:bg-bg-border">
      <h3 className="text-sm font-medium text-secondary uppercase tracking-widest mb-2">{label}</h3>
      <p className="text-3xl font-bold font-mono text-primary">{value}</p>
    </div>
  );
}
