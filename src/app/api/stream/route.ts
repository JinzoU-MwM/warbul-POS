export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { onChange } from "@/lib/events";

export async function GET(req: Request) {
  const encoder = new TextEncoder();
  let off: (() => void) | null = null;
  let keepalive: ReturnType<typeof setInterval> | null = null;
  const stream = new ReadableStream({
    start(controller) {
      const send = (event: string, data: unknown) =>
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      send("ping", { t: Date.now() });
      off = onChange((kind) => send("change", { kind }));
      keepalive = setInterval(() => {
        try { controller.enqueue(encoder.encode(`: keepalive\n\n`)); } catch {}
      }, 25000);
      req.signal.addEventListener("abort", () => {
        off?.(); if (keepalive) clearInterval(keepalive);
        try { controller.close(); } catch {}
      });
    },
    cancel() { off?.(); if (keepalive) clearInterval(keepalive); },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
    },
  });
}
