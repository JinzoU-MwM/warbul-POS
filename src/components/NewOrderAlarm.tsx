"use client";
// Loud, can't-miss alarm for new dine-in customer orders. Mounted in the cashier
// (PosApp) and owner (OwnerApp) shells. Rides the existing 6s order poll — when a
// new unpaid dine-in order appears it shows a blocking overlay and rings a Web
// Audio chime every ~4s until the cashier acknowledges (taps a button).
import { useEffect, useRef, useState, type JSX } from "react";
import { listOrders } from "@/lib/api";
import { useLive } from "@/lib/use-live";
import { ORDER_STATUS } from "@/lib/constants";
import type { Order } from "@/lib/types";
import { Icons } from "./icons";

const pad2 = (n: number) => String(n).padStart(2, "0");

// A "new order" worth ringing for = a dine-in order still awaiting payment.
// (Cashier walk-ins they paid on the spot aren't WAIT_PAY, so they don't ring.)
function isPending(o: Order): boolean {
  return o.table > 0 && o.status === ORDER_STATUS.WAIT_PAY && !o.paid;
}

type ACtor = typeof AudioContext;

export function NewOrderAlarm({ onView }: { onView: () => void }): JSX.Element | null {
  const seen = useRef<Set<string> | null>(null); // ids already accounted for (seeded on load)
  const [pending, setPending] = useState<Order[]>([]); // unacknowledged new orders
  const [audioReady, setAudioReady] = useState(false);
  const acRef = useRef<AudioContext | null>(null);

  function ensureAudio(): AudioContext | null {
    try {
      const Ctor: ACtor | undefined =
        window.AudioContext || (window as unknown as { webkitAudioContext?: ACtor }).webkitAudioContext;
      if (!Ctor) return null;
      const ac = acRef.current ?? new Ctor();
      acRef.current = ac;
      void ac.resume?.();
      setAudioReady(ac.state === "running");
      ac.onstatechange = () => setAudioReady(ac.state === "running");
      return ac;
    } catch {
      return null;
    }
  }

  /* ── audio unlock: browsers require a user gesture before sound ── */
  useEffect(() => {
    function unlock() {
      if (acRef.current?.state === "running") return;
      ensureAudio();
    }
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  function chime() {
    const ac = acRef.current;
    if (!ac || ac.state !== "running") return;
    const now = ac.currentTime;
    // two-tone "ding-dong"
    for (const { f, t } of [{ f: 880, t: 0 }, { f: 660, t: 0.2 }]) {
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = "sine";
      osc.frequency.value = f;
      gain.gain.setValueAtTime(0.0001, now + t);
      gain.gain.exponentialRampToValueAtTime(0.4, now + t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + t + 0.5);
      osc.connect(gain).connect(ac.destination);
      osc.start(now + t);
      osc.stop(now + t + 0.55);
    }
  }

  /* ── detect new orders off the live poll ── */
  function refresh() {
    listOrders("active")
      .then((orders) => {
        if (seen.current === null) {
          // first load: treat everything already here as "seen" — don't ring.
          seen.current = new Set(orders.map((o) => o.id));
          return;
        }
        const seenSet = seen.current;
        const nowPending = orders.filter(isPending);
        const nowPendingIds = new Set(nowPending.map((o) => o.id));
        const fresh = nowPending.filter((o) => !seenSet.has(o.id));
        for (const o of orders) seenSet.add(o.id);
        setPending((prev) => {
          const kept = prev.filter((p) => nowPendingIds.has(p.id)); // drop paid/cancelled
          const keptIds = new Set(kept.map((k) => k.id));
          return [...kept, ...fresh.filter((f) => !keptIds.has(f.id))];
        });
      })
      .catch(() => {});
  }

  useEffect(() => { refresh(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useLive(["orders"], refresh);

  /* ── ring loop: chime now + every 4s while anything is pending ── */
  useEffect(() => {
    if (!pending.length) return;
    chime();
    const id = setInterval(chime, 4000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending.length, audioReady]);

  if (!pending.length) return null;

  const dismiss = () => setPending([]); // acknowledge: stop ring + close, stay put
  const view = () => { setPending([]); onView(); }; // acknowledge + go to orders

  const tables = [...new Set(pending.map((p) => p.table))].sort((a, b) => a - b);
  const many = pending.length > 1;

  return (
    <div className="noa-bd" role="alertdialog" aria-label="Pesanan baru">
      <style>{`
        .noa-bd{position:fixed;inset:0;z-index:400;background:rgba(28,20,12,.6);display:grid;place-items:center;padding:18px;animation:noa-fade .2s}
        .noa-card{background:#fff;border-radius:24px;max-width:420px;width:100%;padding:30px 26px;text-align:center;box-shadow:0 30px 70px -20px rgba(0,0,0,.55);animation:noa-pop .25s}
        .noa-ring{width:90px;height:90px;border-radius:50%;background:var(--green-ok-bg);color:var(--green-700);display:grid;place-items:center;margin:0 auto 18px;animation:noa-ring 1s ease-in-out infinite}
        @keyframes noa-fade{from{opacity:0}}
        @keyframes noa-pop{from{opacity:0;transform:scale(.9)}}
        @keyframes noa-ring{0%,100%{transform:scale(1);box-shadow:0 0 0 0 rgba(62,124,83,.35)}50%{transform:scale(1.06);box-shadow:0 0 0 16px rgba(62,124,83,0)}}
      `}</style>
      <div className="noa-card">
        <div className="noa-ring"><Icons.bell size={40} /></div>
        <div className="brand" style={{ fontSize: 25, fontWeight: 800, color: "var(--green-800)" }}>
          Pesanan Baru!
        </div>
        <div style={{ fontSize: 15, color: "#6f6353", marginTop: 8, lineHeight: 1.5 }}>
          {many ? (
            <>
              <b>{pending.length} pesanan</b> menunggu — Meja {tables.map(pad2).join(", ")}
            </>
          ) : (
            <>
              Ada pesanan dari <b>Meja {pad2(tables[0])}</b> yang menunggu diproses.
            </>
          )}
        </div>

        <button
          type="button"
          onClick={view}
          className="btn btn-gold"
          style={{ width: "100%", marginTop: 22, padding: "16px", fontSize: 16, borderRadius: 15 }}
        >
          Lihat Pesanan
        </button>

        <div style={{ display: "flex", gap: 10, marginTop: 11 }}>
          <button
            type="button"
            onClick={dismiss}
            className="btn"
            style={{ flex: 1, padding: "11px", borderRadius: 13, background: "#fff", color: "var(--ink)", border: "1.5px solid var(--line)" }}
          >
            Tutup
          </button>
          {!audioReady && (
            <button
              type="button"
              onClick={() => ensureAudio()}
              className="btn"
              style={{ flex: 1, padding: "11px", borderRadius: 13, background: "var(--green-ok-bg)", color: "var(--green-700)", border: "1.5px solid var(--green-700)", fontWeight: 700 }}
            >
              Aktifkan suara
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
