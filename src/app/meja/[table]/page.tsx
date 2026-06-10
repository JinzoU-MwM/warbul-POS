import CustomerApp from "./CustomerApp";
import { ModifiersProvider } from "@/components";
import { getModifierGroups } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ table: string }> }) {
  const { table } = await params;
  const n = parseInt(table, 10) || 0;
  const groups = await getModifierGroups();
  return (
    <ModifiersProvider initial={groups}>
      <CustomerApp table={n} />
    </ModifiersProvider>
  );
}
