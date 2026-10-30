"use client";

import { useEffect, useState } from "react";
import { getSiteContent } from "@/lib/data";

/** Published site_content for a key, merged over the built-in defaults. */
export function useServiceContent<T extends object>(key: string, defaults: T): T {
  const [content, setContent] = useState<T>(defaults);
  useEffect(() => {
    let alive = true;
    getSiteContent<Partial<T>>(key)
      .then((v) => {
        if (alive && v) setContent({ ...defaults, ...v });
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return content;
}
