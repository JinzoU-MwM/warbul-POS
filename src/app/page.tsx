import { redirect } from "next/navigation";

// The app has no public landing page: customers enter via the table QR
// (/meja/[table]); staff enter via /pos. Send the bare root to the POS.
export default function RootPage() {
  redirect("/pos");
}
