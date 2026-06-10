import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/session";
import { ModifiersProvider } from "@/components";
import { getModifierGroups } from "@/lib/store";
import { PosApp, type PosView } from "./PosApp";

export const dynamic = "force-dynamic";

const VIEWS: PosView[] = ["neworder", "orders", "menu"];

export default async function PosPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const session = await getServerSession();
  if (!session?.user) redirect("/pos/login?next=/pos");
  const u = session.user as { name?: string; username?: string; role?: string };

  const { view } = await searchParams;
  const initialView: PosView = VIEWS.includes(view as PosView) ? (view as PosView) : "orders";
  const groups = await getModifierGroups();

  return (
    <ModifiersProvider initial={groups}>
      <PosApp
        user={{
          name: u.name ?? u.username ?? "Kasir",
          username: u.username ?? "kasir",
          role: u.role ?? "kasir",
        }}
        initialView={initialView}
      />
    </ModifiersProvider>
  );
}
