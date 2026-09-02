import type { ReactNode } from "react";

export function InspectorSection({
  children,
  flush = false,
  separated = false,
  title,
}: {
  children: ReactNode;
  flush?: boolean;
  separated?: boolean;
  title: string;
}) {
  const spacing = flush
    ? "mt-1"
    : separated
      ? "mt-5 border-t border-white/8 pt-5"
      : "mt-4 first:mt-0";

  return (
    <section className={spacing}>
      <h3 className="mb-1 text-xs font-medium text-slate-400">{title}</h3>
      {children}
    </section>
  );
}

export function MetricRows({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <dl>
      {rows.map(([label, value]) => (
        <div className="grid grid-cols-[1fr_auto] items-center gap-4 py-2" key={label}>
          <dt className="text-xs text-slate-500">{label}</dt>
          <dd className="text-right text-sm font-medium text-slate-200">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
