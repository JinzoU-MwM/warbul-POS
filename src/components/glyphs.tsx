// Decorative brand glyphs (cup / bowl / fries). Pure SVG, server-safe.
// Paths copied verbatim from the Warbul prototypes' GLYPH map.
import type { JSX } from "react";

export interface GlyphProps {
  color?: string;
  size?: number;
}

export function Cup({ color = "#fff", size = 46 }: GlyphProps): JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <path d="M9 16h26v11a9 9 0 0 1-9 9H18a9 9 0 0 1-9-9V16Z" stroke={color} strokeWidth="2.4" />
      <path d="M35 19h4a4 4 0 0 1 0 8h-4" stroke={color} strokeWidth="2.4" />
      <path d="M16 7c-1.5 2 1.5 3 0 5M23 7c-1.5 2 1.5 3 0 5" stroke={color} strokeWidth="2.2" strokeLinecap="round" opacity=".8" />
    </svg>
  );
}

export function Bowl({ color = "#fff", size = 46 }: GlyphProps): JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <path d="M8 22h32a16 16 0 0 1-16 16A16 16 0 0 1 8 22Z" stroke={color} strokeWidth="2.4" />
      <path d="M16 22c0-7 16-7 16 0M20 9c-1 2 1 3 0 5M27 9c-1 2 1 3 0 5" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

export function Fries({ color = "#fff", size = 46 }: GlyphProps): JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <path d="M13 22h22l-2 16H15l-2-16Z" stroke={color} strokeWidth="2.4" />
      <path d="M17 22l-1-11M22 22V9M27 22l1-12M32 22l2-9" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

export function Bean({ color = "#fff", size = 46 }: GlyphProps): JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <ellipse cx="24" cy="24" rx="13" ry="17" stroke={color} strokeWidth="2.4" />
      <path d="M24 8c-5 6-5 26 0 32M19 11c4 4 4 22 0 26" stroke={color} strokeWidth="2.2" opacity=".85" />
    </svg>
  );
}

export const GLYPHS = { cup: Cup, bowl: Bowl, fries: Fries } as const;
