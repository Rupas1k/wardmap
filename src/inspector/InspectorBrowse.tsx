import type { ReactNode } from "react";
import { BsChevronDown, BsChevronRight } from "react-icons/bs";
import { SwitchNav } from "../components/ui";

export function BrowseTabs<T extends string>({
  active,
  onChange,
  options,
}: {
  active: T;
  onChange: (option: T) => void;
  options: readonly T[];
}) {
  return (
    <SwitchNav
      className="w-[13.5rem] shrink-0"
      options={options.map((option) => ({
        value: option,
        label: option.charAt(0).toUpperCase() + option.slice(1),
      }))}
      value={active}
      onChange={onChange}
    />
  );
}

export function DisclosureRow({
  expanded,
  label,
  meta,
  onClick,
  trailing,
}: {
  expanded: boolean;
  label: ReactNode;
  meta?: ReactNode;
  onClick: () => void;
  trailing: ReactNode;
}) {
  return (
    <button
      aria-expanded={expanded}
      className={`grid w-full grid-cols-[1rem_minmax(0,1fr)_auto] items-center gap-2 rounded-sm py-2 text-left transition ${
        expanded ? "bg-white/6 text-white" : "text-slate-300 hover:bg-white/4"
      }`}
      type="button"
      onClick={onClick}
    >
      {expanded ? <BsChevronDown /> : <BsChevronRight className="text-slate-600" />}
      <span className="min-w-0">
        <span className="block truncate text-xs">{label}</span>
        {meta ? <span className="block truncate text-[10px] text-slate-600">{meta}</span> : null}
      </span>
      {trailing}
    </button>
  );
}
