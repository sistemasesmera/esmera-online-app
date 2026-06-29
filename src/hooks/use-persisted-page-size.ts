"use client";

import { useState } from "react";

export function usePersistedPageSize(storageKey: string, defaultSize = 20): [number, (size: number) => void] {
  const [pageSize, setPageSizeState] = useState<number>(() => {
    if (typeof window === "undefined") return defaultSize;
    const saved = localStorage.getItem(storageKey);
    const parsed = saved ? parseInt(saved, 10) : NaN;
    return isNaN(parsed) ? defaultSize : parsed;
  });

  function setPageSize(size: number) {
    localStorage.setItem(storageKey, String(size));
    setPageSizeState(size);
  }

  return [pageSize, setPageSize];
}
