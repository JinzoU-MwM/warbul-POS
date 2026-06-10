"use client";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { authClient } from "@/lib/auth-client";

export default function PosLoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next"); // explicit destination, if redirected here
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    const { data, error } = await authClient.signIn.username({ username: username.trim(), password });
    setBusy(false);
    if (error) {
      setErr(error.message || "Username atau kata sandi salah");
      return;
    }
    // Honor an explicit redirect target; otherwise route owners to their
    // dashboard and cashiers to the POS.
    const role = (data?.user as { role?: string } | undefined)?.role;
    const dest = next || (role === "owner" ? "/owner" : "/pos");
    router.push(dest);
    router.refresh();
  }

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        padding: 22,
        fontFamily: "var(--font-jakarta), sans-serif",
        color: "var(--cream)",
        background:
          "radial-gradient(120% 90% at 12% -10%, #34503D 0%, transparent 55%), radial-gradient(100% 80% at 100% 0%, #2A4032 0%, transparent 50%), var(--green-900)",
      }}
    >
      <div style={{ width: "100%", maxWidth: 380 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 13, marginBottom: 22, justifyContent: "center" }}>
          <Image src="/warbul-logo.png" alt="Warbul" width={52} height={52} style={{ borderRadius: "50%" }} />
          <div>
            <div className="brand t-gold" style={{ fontSize: 24, fontWeight: 800, lineHeight: 1 }}>Warbul</div>
            <div style={{ fontSize: 11, color: "rgba(244,237,217,.6)", fontWeight: 600, letterSpacing: ".05em" }}>KASIR POS</div>
          </div>
        </div>

        <form
          onSubmit={submit}
          style={{ background: "#fff", color: "var(--ink)", borderRadius: 20, padding: "26px 24px", boxShadow: "var(--shadow-lg)" }}
        >
          <div className="brand" style={{ fontSize: 21, fontWeight: 700, marginBottom: 4 }}>Masuk ke POS</div>
          <div style={{ fontSize: 13, color: "#8b7f6c", marginBottom: 18 }}>Login untuk mengelola pesanan kafe.</div>

          <label style={{ fontSize: 12.5, fontWeight: 700, color: "#6f6353" }}>Username</label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoFocus
            placeholder="kasir"
            style={fld}
          />
          <label style={{ fontSize: 12.5, fontWeight: 700, color: "#6f6353", marginTop: 12, display: "block" }}>Kata Sandi</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            style={fld}
          />

          {err && <div style={{ color: "var(--red)", fontSize: 12.5, fontWeight: 600, marginTop: 12 }}>{err}</div>}

          <button
            type="submit"
            disabled={busy}
            className="btn btn-green"
            style={{ width: "100%", marginTop: 18, padding: 14, borderRadius: 13, fontSize: 15, opacity: busy ? 0.6 : 1 }}
          >
            {busy ? "Memproses…" : "Masuk"}
          </button>

        </form>
      </div>
    </div>
  );
}

const fld: React.CSSProperties = {
  width: "100%",
  marginTop: 6,
  border: "1.5px solid var(--line)",
  borderRadius: 11,
  padding: "11px 13px",
  fontSize: 14,
  outline: "none",
  fontFamily: "inherit",
  background: "#fff",
  color: "var(--ink)",
};
