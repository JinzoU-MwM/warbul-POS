import { useEffect, useState } from "react";
import { getCategories } from "./api";

export function useCategories(): string[] {
  const [cats, setCats] = useState<string[]>([]);
  useEffect(() => {
    getCategories().then((data) => setCats(data.map((c) => c.name))).catch(() => {});
  }, []);
  return cats;
}
