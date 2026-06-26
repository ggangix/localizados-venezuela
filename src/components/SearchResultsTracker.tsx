"use client";

import { useEffect, useRef } from "react";
import { analytics } from "@/lib/analytics";

export function SearchResultsTracker({
  query,
  total,
}: {
  query: string;
  total: number;
}) {
  const lastKey = useRef("");

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) return;

    const key = `${trimmed}:${total}`;
    if (lastKey.current === key) return;
    lastKey.current = key;

    analytics.viewSearchResults(trimmed.length, total);
  }, [query, total]);

  return null;
}
