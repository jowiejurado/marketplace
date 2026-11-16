"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** While Stripe's webhook hasn't confirmed the order yet, re-check every few seconds (for up to a minute). */
export function RefreshWhilePending() {
  const router = useRouter();

  useEffect(() => {
    let tries = 0;
    const id = setInterval(() => {
      tries += 1;
      router.refresh();
      if (tries >= 20) clearInterval(id);
    }, 3000);
    return () => clearInterval(id);
  }, [router]);

  return null;
}
