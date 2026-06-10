import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/session";
import { OwnerApp } from "./OwnerApp";

export const dynamic = "force-dynamic";

export default async function OwnerPage() {
  const session = await getServerSession();
  if (!session?.user) redirect("/pos/login?next=/owner");
  const u = session.user as { name?: string; username?: string; role?: string };
  if (u.role !== "owner") redirect("/pos");
  return (
    <OwnerApp
      user={{
        name: u.name ?? u.username ?? "Pemilik",
        role: u.role ?? "owner",
      }}
    />
  );
}
