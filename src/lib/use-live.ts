"use client";
import { useEffect, useRef } from "react";
import type { ChangeKind } from "./events";

/**
 * Subscribe to server-side data changes (orders/menu/members/settings/modifiers).
 *
 *   useLive(["orders", "menu"], (kind) => refetch());
 *
 * Two delivery paths run together:
 *  - **SSE** (`/api/stream`) pushes changes instantly. This only works when the
 *    app runs as a single long-lived Node process (`next start`, or a persistent
 *    host), because the event bus is in-memory (see `src/lib/events.ts`).
 *  - **Polling** re-fetches every requested kind on an interval. This is the
 *    fallback that keeps clients fresh on **serverless** (e.g. Vercel), where the
 *    in-memory SSE bus can't see writes made in other function instances.
 *
 * On serverless, set `NEXT_PUBLIC_DISABLE_SSE=1` to skip the (useless, and on
 * Vercel resource-burning) SSE connection and rely on polling alone.
 */
const POLL_MS = 6000;
const SSE_DISABLED = process.env.NEXT_PUBLIC_DISABLE_SSE === "1";

export function useLive(kinds: ChangeKind[], onKind: (kind: ChangeKind) => void) {
  const cb = useRef(onKind);
  cb.current = onKind;
  const key = kinds.join(",");

  useEffect(() => {
    const want = key.split(",") as ChangeKind[];
    const wantSet = new Set(want);

    // Polling fallback — the only path that works on serverless. Cheap for a
    // single-cafe POS. Consumers ignore the `kind` and refetch what they need.
    const poll = setInterval(() => want.forEach((k) => cb.current(k)), POLL_MS);

    // SSE accelerator — instant updates where a long-lived process is available.
    let es: EventSource | null = null;
    if (!SSE_DISABLED && typeof EventSource !== "undefined") {
      es = new EventSource("/api/stream");
      es.addEventListener("change", (e) => {
        try {
          const { kind } = JSON.parse((e as MessageEvent).data) as { kind: ChangeKind };
          if (wantSet.has(kind)) cb.current(kind);
        } catch {}
      });
    }

    return () => {
      clearInterval(poll);
      es?.close();
    };
  }, [key]);
}
