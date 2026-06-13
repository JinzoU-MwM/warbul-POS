"use client";
// Visible "Download Android app" banner for the owner dashboard. Hidden when
// already running inside the native app. The APK is published by the GitHub
// Actions "Android APK" workflow to the latest release.
import { useEffect, useState, type JSX } from "react";
import { isNativeApp } from "@/lib/escpos";

const APK_URL =
  "https://github.com/JinzoU-MwM/warbul-POS/releases/latest/download/warbul.apk";

export function DownloadAppBanner(): JSX.Element | null {
  const [show, setShow] = useState(false);
  useEffect(() => {
    // Only on the web (not inside the app); APK targets Android.
    setShow(!isNativeApp());
  }, []);
  if (!show) return null;

  return (
    <a
      href={APK_URL}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        marginBottom: 18,
        padding: "14px 16px",
        borderRadius: 14,
        textDecoration: "none",
        background: "linear-gradient(135deg, var(--green-900,#21342a), var(--coffee,#6f4e37))",
        color: "#fff",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <span style={{ fontSize: 26, lineHeight: 1 }}>📲</span>
      <span style={{ flex: 1 }}>
        <span style={{ display: "block", fontWeight: 800, fontSize: 14.5 }}>
          Download Aplikasi Kasir (Android)
        </span>
        <span style={{ display: "block", fontSize: 12, opacity: 0.85, marginTop: 2 }}>
          Cetak struk langsung ke printer Bluetooth — tanpa RawBT.
        </span>
      </span>
      <span
        style={{
          background: "#fff",
          color: "var(--green-900,#21342a)",
          fontWeight: 800,
          fontSize: 13,
          padding: "8px 14px",
          borderRadius: 10,
          whiteSpace: "nowrap",
        }}
      >
        Unduh APK
      </span>
    </a>
  );
}
