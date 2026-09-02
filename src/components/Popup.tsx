import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { elevatedSurfaceClass } from "./ui";

interface PopupProps {
  align?: "left" | "right";
  ariaLabel?: string;
  children: (controls: { close: () => void }) => ReactNode;
  className?: string;
  disabled?: boolean;
  panelClassName?: string;
  placement?: "top" | "bottom";
  trigger: ReactNode;
  triggerClassName?: string;
  triggerTitle?: string;
}

export default function Popup({
  align = "left",
  ariaLabel,
  children,
  className = "",
  disabled = false,
  panelClassName = "",
  placement = "bottom",
  trigger,
  triggerClassName = "",
  triggerTitle,
}: PopupProps) {
  const details = useRef<HTMLDetailsElement>(null);
  const close = () => details.current?.removeAttribute("open");

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        close();
      }
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (details.current?.open && !details.current.contains(event.target as Node)) {
        close();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, []);

  const position = placement === "top" ? "bottom-full mb-2" : "top-full mt-2";
  const alignment = align === "right" ? "right-0" : "left-0";

  return (
    <details ref={details} className={`group relative w-fit ${className}`}>
      <summary
        aria-label={ariaLabel}
        aria-disabled={disabled}
        className={`cursor-pointer list-none ${disabled ? "pointer-events-none opacity-30" : ""} ${triggerClassName}`}
        title={triggerTitle}
      >
        {trigger}
      </summary>
      <div
        className={`${elevatedSurfaceClass} absolute ${position} ${alignment} z-50 w-[min(16rem,calc(100vw-2rem))] p-3 ${panelClassName}`}
      >
        {children({ close })}
      </div>
    </details>
  );
}
