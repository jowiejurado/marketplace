"use client";

import { usePathname } from "next/navigation";

/** Shows the address that wasn't found, so people can spot a typo. */
export function MissingPath({ className }: { className?: string }) {
  const pathname = usePathname();
  if (!pathname || pathname === "/") return null;
  let shown = pathname;
  try {
    shown = decodeURI(pathname);
  } catch {
    // Malformed escape: show it as typed.
  }
  return (
    <p className={className}>
      Nothing at <code>{shown}</code>
    </p>
  );
}
