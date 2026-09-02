import type { ButtonHTMLAttributes, ReactNode } from "react";

export const formControlClass =
  "w-full rounded-sm border border-white/10 bg-slate-950 px-2 py-1.5 text-xs text-slate-200 outline-none focus:border-slate-500";

export const fieldControlClass = `mt-1 ${formControlClass}`;

export const elevatedSurfaceClass = "border border-white/15 bg-slate-950/95 shadow-xl";

export const floatingIconControlClass =
  "rounded-lg bg-slate-950/85 p-2 text-base text-slate-400 hover:text-white";

export interface SwitchNavOption<T extends string> {
  value: T;
  label: ReactNode;
  disabled?: boolean;
}

export function SwitchNav<T extends string>({
  className = "",
  onChange,
  options,
  value,
}: {
  className?: string;
  onChange: (value: T) => void;
  options: readonly SwitchNavOption<T>[];
  value: T;
}) {
  return (
    <div
      aria-label="View options"
      className={`flex border-b border-white/10 ${className}`}
      role="tablist"
    >
      {options.map((option) => {
        const selected = option.value === value;

        return (
          <button
            aria-selected={selected}
            className={`relative min-w-0 flex-1 px-2 py-2.5 text-xs transition-colors after:absolute after:right-0 after:bottom-0 after:left-0 after:h-px ${
              selected
                ? "text-slate-100 after:bg-cyan-400"
                : "text-slate-500 after:bg-transparent hover:text-slate-300"
            } disabled:cursor-not-allowed disabled:text-slate-700 disabled:hover:text-slate-700`}
            disabled={option.disabled}
            key={option.value}
            role="tab"
            type="button"
            onClick={() => onChange(option.value)}
          >
            <span className="block truncate">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function selectableRowClass(selected: boolean): string {
  return selected
    ? "rounded-sm bg-amber-300/8 ring-1 ring-inset ring-amber-300/40 transition"
    : "rounded-sm transition hover:bg-white/4";
}

export function FloatingIconButton({
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={`${floatingIconControlClass} ${className}`} type="button" {...props} />;
}

export function EmptyState({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <p className={`py-8 text-center text-sm text-slate-500 ${className}`}>{children}</p>;
}
