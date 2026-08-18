import * as React from "react";

interface LogoProps {
  /** Pixel size of the square mark (width == height). Default 28. */
  size?: number;
  /** Render the "Papex" wordmark next to the mark. Default false. */
  showWordmark?: boolean;
  className?: string;
}

/**
 * Papex brand logo: a flat document mark (page with a folded corner and two
 * text lines) inside the brand-colored rounded tile. The tile and glyph read
 * their colors from the active theme via CSS variables, so the logo stays
 * correct in both light and dark mode. Scales crisply at any size.
 */
export function Logo({ size = 28, showWordmark = false, className }: LogoProps) {
  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ""}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        role="img"
        aria-label="Papex"
        className="shrink-0"
      >
        <rect width="32" height="32" rx="8" style={{ fill: "hsl(var(--primary))" }} />
        <g
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.7"
          style={{ stroke: "hsl(var(--primary-foreground))" }}
        >
          <path d="M11 9 H19 L23 13 V25 H11 Z" />
          <path d="M19 9 V13 H23" />
          <path d="M14 17 H20" />
          <path d="M14 20.5 H20" />
        </g>
      </svg>
      {showWordmark && (
        <span className="font-heading text-lg font-semibold tracking-tight">Papex</span>
      )}
    </span>
  );
}
