"use client";
import { useEffect, useRef } from "react";
import type { ChangeKind } from "./events";

/**
 * Subscribe to the server's SSE change feed. `onKind` fires whenever the server
 * emits a change of one of the requested kinds (orders/menu/members/settings).
 * Auto-reconnects via the browser's EventSource. No manual refresh needed.
 *
 *   useLive(["orders", "menu"], (kind) => refetch());
 */
export function useLive(kinds: ChangeKind[], onKind: (kind: ChangeKind) => void) {
  const cb = useRef(onKind);
  cb.current = onKind;
  const key = kinds.join(",");

  useEffect(() => {
    const want = new Set(key.split(",") as ChangeKind[]);
    const es = new EventSource("/api/stream");
    es.addEventListener("change", (e) => {
      try {
        const { kind } = JSON.parse((e as MessageEvent).data) as { kind: ChangeKind };
        if (want.has(kind)) cb.current(kind);
      } catch {}
    });
    return () => es.close();
  }, [key]);
}
