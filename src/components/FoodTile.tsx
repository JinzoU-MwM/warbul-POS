// Gradient menu tile with a centered brand glyph, or the product photo when set.
// Pure display.
import type { JSX } from "react";
import type { Glyph } from "@/lib/types";
import { driveImageUrl } from "@/lib/images";
import { Cup, Bowl, Fries } from "./glyphs";

const GLYPHS: Record<Glyph, typeof Cup> = { cup: Cup, bowl: Bowl, fries: Fries };

export interface FoodTileItem {
  g: Glyph;
  grad: [string, string];
  available: boolean;
  stock: number;
  image?: string | null;
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
  const src = driveImageUrl(item.image);
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
      {/* Glyph sits behind the photo, so a broken/private image link falls back to it. */}
      <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
        <G color="rgba(255,255,255,.82)" size={glyphSize} />
      </div>
      {src && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          loading="lazy"
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
        />
      )}
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
