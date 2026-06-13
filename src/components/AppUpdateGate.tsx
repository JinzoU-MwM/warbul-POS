"use client";
// In-app APK update check (native app only). The web/UI auto-updates via the
// remote URL; this only nudges users when a newer NATIVE build is published.
// Compares the installed versionCode (App.getInfo().build) against
// /app-version.json (refreshed by the Android CI on each app-v* tag).
import { useEffect, useState, type JSX } from "react";
import { isNativeApp } from "@/lib/escpos";

type VersionInfo = { versionCode: number; versionName?: string; url?: string; notes?: string };

export function AppUpdateGate(): JSX.Element | null {
  const [latest, setLatest] = useState<VersionInfo | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!isNativeApp()) return;
    let cancelled = false;
    (async () => {
      try {
        const { App } = await import("@capacitor/app");
        const info = await App.getInfo();
        const current = parseInt(info.build || "0", 10) || 0;
        const res = await fetch("/app-version.json?ts=" + Date.now(), { cache: "no-store" });
        if (!res.ok) return;
        const v: VersionInfo = await res.json();
        if (!cancelled && typeof v.versionCode === "number" && v.versionCode > current) {
          setLatest(v);
        }
      } catch {
        /* offline / no manifest / web — ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!latest || dismissed) return null;

  const update = async () => {
    const { Browser } = await import("@capacitor/browser");
    const u = latest.url || "/warbul.apk";
    const url = u.startsWith("http") ? u : window.location.origin + u;
    await Browser.open({ url }); // system browser downloads the APK → tap to install
  };

  return (
    <div
      style={{
        position: "fixed",
        left: 12,
        right: 12,
        bottom: 12,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 14px",
        borderRadius: 14,
        background: "#21342a",
        color: "#fff",
        boxShadow: "0 8px 24px rgba(0,0,0,.3)",
      }}
    >
      <span style={{ fontSize: 22 }}>⬆️</span>
      <span style={{ flex: 1, fontSize: 13 }}>
        <b>Update aplikasi tersedia</b>
        {latest.versionName ? " (" + latest.versionName + ")" : ""}
        {latest.notes ? " — " + latest.notes : ""}
      </span>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        style={{ background: "none", border: "none", color: "#cbd5cf", fontSize: 12, cursor: "pointer" }}
      >
        Nanti
      </button>
      <button
        type="button"
        onClick={update}
        style={{
          background: "#fff",
          color: "#21342a",
          fontWeight: 800,
          fontSize: 13,
          border: "none",
          borderRadius: 10,
          padding: "8px 14px",
          cursor: "pointer",
        }}
      >
        Perbarui
      </button>
    </div>
  );
}
