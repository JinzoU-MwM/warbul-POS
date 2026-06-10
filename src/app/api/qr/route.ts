export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest } from "next/server";
import QRCode from "qrcode";

// Renders a scannable QR code (SVG) for an arbitrary string.
// Used by the owner "QR Meja" page: /api/qr?data=<encoded table URL>
export async function GET(req: NextRequest) {
  const data = req.nextUrl.searchParams.get("data");
  if (!data) return new Response("missing ?data", { status: 400 });
  try {
    const svg = await QRCode.toString(data, {
      type: "svg",
      margin: 1,
      errorCorrectionLevel: "M",
      color: { dark: "#21342A", light: "#ffffff" }, // brand forest-green on white, still high-contrast
    });
    return new Response(svg, {
      headers: {
        "content-type": "image/svg+xml",
        "cache-control": "public, max-age=86400",
      },
    });
  } catch (err) {
    return new Response("qr error: " + String((err as Error)?.message ?? err), { status: 400 });
  }
}
