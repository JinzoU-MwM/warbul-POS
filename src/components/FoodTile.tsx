// Gradient menu tile with a centered brand glyph. Pure display.
import type { JSX } from "react";
import type { Glyph } from "@/lib/types";
import { Cup, Bowl, Fries } from "./glyphs";

const GLYPHS: Record<Glyph, typeof Cup> = { cup: Cup, bowl: Bowl, fries: Fries };

export interface FoodTileItem {
  g: Glyph;
  grad: [string, string];
  available: boolean;
  stock: number;
}

export interface FoodTileProps {
  item: FoodTileItem;
  h?: number;
  glyphSize?: number;
  rounded?: number;
}

export function FoodTile({ item, h = 96, glyphSize = 46, rounded }: FoodTileProps): JSX.Element {
  const G = GLYPHS[item.g] ?? Cup;
  const out = item.available === false || item.stock === 0;
  return (
    <div
      style={{
        position: "relative",
        height: h,
        borderRadius: rounded,
        overflow: "hidden",
        background: `linear-gradient(135deg,${item.grad[0]},${item.grad[1]})`,
      }}
    >
      <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
        <G color="rgba(255,255,255,.82)" size={glyphSize} />
      </div>
      {out && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(28,20,12,.55)",
            display: "grid",
            placeItems: "center",
            color: "#fff",
            fontWeight: 800,
            fontSize: 12,
            letterSpacing: ".04em",
          }}
        >
          HABIS
        </div>
      )}
    </div>
  );
}
