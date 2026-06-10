"use client";
// Provides the live modifier/add-on groups (DB-backed, owner-editable) to the
// customer menu and cashier ticket, with bound helper functions. Falls back to
// the built-in defaults when used outside a provider.
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { ModGroup, ModGroupFull, Product, Selection } from "@/lib/types";
import {
  DEFAULT_MODIFIER_GROUPS,
  modGroupsFor as fnModGroupsFor,
  defaultSelection as fnDefaultSelection,
  unitPrice as fnUnitPrice,
  modSummary as fnModSummary,
} from "@/lib/modifiers";
import { getModifiers } from "@/lib/api";
import { useLive } from "@/lib/use-live";

interface ModifiersCtx {
  groups: ModGroupFull[];
  modGroupsFor: (item: Pick<Product, "cat">) => ModGroup[];
  defaultSelection: (item: Pick<Product, "cat">) => Selection;
  unitPrice: (item: Pick<Product, "cat" | "price">, sel?: Selection) => number;
  modSummary: (item: Pick<Product, "cat">, sel?: Selection) => string[];
}

function boundTo(groups: ModGroupFull[]): ModifiersCtx {
  return {
    groups,
    modGroupsFor: (item) => fnModGroupsFor(item, groups),
    defaultSelection: (item) => fnDefaultSelection(item, groups),
    unitPrice: (item, sel) => fnUnitPrice(item, sel, groups),
    modSummary: (item, sel) => fnModSummary(item, sel, groups),
  };
}

const Ctx = createContext<ModifiersCtx | null>(null);

export function ModifiersProvider({
  initial,
  children,
}: {
  initial?: ModGroupFull[];
  children: React.ReactNode;
}) {
  const [groups, setGroups] = useState<ModGroupFull[]>(
    initial && initial.length ? initial : DEFAULT_MODIFIER_GROUPS,
  );
  const refresh = useCallback(() => {
    getModifiers()
      .then((g) => { if (g.length) setGroups(g); })
      .catch(() => {});
  }, []);
  useEffect(() => { refresh(); }, [refresh]);
  useLive(["modifiers"], refresh);

  return <Ctx.Provider value={boundTo(groups)}>{children}</Ctx.Provider>;
}

export function useModifiers(): ModifiersCtx {
  return useContext(Ctx) ?? boundTo(DEFAULT_MODIFIER_GROUPS);
}
