// Loyalty stamp card. Pure display.
import type { JSX } from "react";
import type { Member } from "@/lib/types";
import { Bean } from "./glyphs";

export interface StampCardProps {
  member: Pick<Member, "points" | "stamps">;
}

export function StampCard({ member }: StampCardProps): JSX.Element {
  return (
    <div
      style={{
        background: "var(--green-800)",
        borderRadius: 18,
        padding: "15px 17px",
        color: "var(--cream)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div style={{ position: "absolute", right: -10, top: -12, opacity: 0.12 }}>
        <Bean color="var(--gold)" size={90} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 11, opacity: 0.7, fontWeight: 600 }}>KARTU STEMPEL WARBUL</div>
          <div className="brand" style={{ fontSize: 16, fontWeight: 700, color: "var(--gold)" }}>
            {member.points} poin
          </div>
        </div>
        <div style={{ fontSize: 12, fontWeight: 700 }}>{member.stamps}/10</div>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(10,1fr)",
          gap: 5,
          marginTop: 12,
          position: "relative",
        }}
      >
        {Array.from({ length: 10 }, (_, i) => {
          const earned = i < member.stamps;
          return (
            <div
              key={i}
              style={{
                aspectRatio: "1",
                borderRadius: 50,
                display: "grid",
                placeItems: "center",
                background: earned ? "var(--gold)" : "rgba(255,255,255,.1)",
              }}
            >
              {earned ? <Bean color="var(--coffee-900)" size={13} /> : null}
            </div>
          );
        })}
      </div>
      <div style={{ fontSize: 11, opacity: 0.75, marginTop: 10 }}>
        Kumpulkan 10 stempel untuk 1 minuman gratis ✦
      </div>
    </div>
  );
}
