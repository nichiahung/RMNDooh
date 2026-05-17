// src/hooks/useSidebarCollapse.ts
'use client';
import { useState, useCallback } from 'react';

const STORAGE_KEY = 'sidebar_collapsed';

export function useSidebarCollapse() {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const toggle = useCallback(() => {
    setCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch {
        // localStorage unavailable (private browsing)
      }
      return next;
    });
  }, []);

  return { collapsed, toggle };
}
