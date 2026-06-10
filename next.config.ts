import type { NextConfig } from "next";
import os from "node:os";

// In dev, Next.js blocks cross-origin requests to /_next/* (assets, HMR) unless
// the requesting origin is whitelisted here. When a phone on the LAN scans a
// table QR (which points at http://<your-ip>:3000/meja/N), that's a different
// origin than localhost, so without this the client bundle never loads and the
// menu shows blank. We auto-detect this machine's LAN IPv4 addresses so it works
// on any network. (Production / `next start` has no such restriction.)
function lanHosts(): string[] {
  const hosts = new Set<string>();
  for (const list of Object.values(os.networkInterfaces())) {
    for (const net of list || []) {
      if (net.family === "IPv4" && !net.internal) hosts.add(net.address);
    }
  }
  return [...hosts];
}

const nextConfig: NextConfig = {
  allowedDevOrigins: lanHosts(),
};

export default nextConfig;
