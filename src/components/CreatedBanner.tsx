"use client";

import { CheckCircleIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import styles from "./MessageSeller.module.css";

/** Shown once after someone publishes a listing (?created=1). */
export function CreatedBanner() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  if (params.get("created") !== "1") return null;

  return (
    <div className={styles.banner} role="status">
      <CheckCircleIcon aria-hidden="true" />
      <p>
        <strong>Your listing is live.</strong> Buyers can now find it and message you. Share this page to sell faster.
      </p>
      <button type="button" aria-label="Dismiss" onClick={() => router.replace(pathname, { scroll: false })}>
        <XMarkIcon aria-hidden="true" />
      </button>
    </div>
  );
}
