import { formatHeroName, heroIconUrl } from "../heroes";

export default function HeroName({
  className = "",
  iconClassName = "size-5",
  value,
}: {
  className?: string;
  iconClassName?: string;
  value: string;
}) {
  const name = formatHeroName(value) ?? "Unknown hero";
  const iconUrl = heroIconUrl(value);

  return (
    <span className={`inline-flex min-w-0 items-center gap-1.5 ${className}`}>
      {iconUrl ? (
        <img
          alt=""
          className={`shrink-0 object-contain ${iconClassName}`}
          loading="lazy"
          src={iconUrl}
          onError={(event) => {
            event.currentTarget.hidden = true;
          }}
        />
      ) : null}
      <span className="truncate">{name}</span>
    </span>
  );
}
