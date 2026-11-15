"use client";

import { MagnifyingGlassIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import styles from "./Header.module.css";

/** Searches within the current category, if one is selected. */
export function SearchBox() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const current = pathname === "/" ? (params.get("q") ?? "") : "";
  const [value, setValue] = useState(current);
  const [synced, setSynced] = useState(current);

  // Keep the box in step with the URL (e.g. after clicking a category or going back).
  if (current !== synced) {
    setSynced(current);
    setValue(current);
  }

  function go(q: string) {
    const next = new URLSearchParams(pathname === "/" ? params : undefined);
    if (q.trim()) next.set("q", q.trim());
    else next.delete("q");
    const qs = next.toString();
    router.push(qs ? `/?${qs}` : "/");
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    go(value);
  }

  return (
    <form role="search" className={styles.search} onSubmit={handleSubmit}>
      <MagnifyingGlassIcon className={styles.searchIcon} aria-hidden="true" />
      <label htmlFor="site-search" className="sr-only">
        Search listings
      </label>
      <input
        id="site-search"
        type="search"
        placeholder="Search Marketplace"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        autoComplete="off"
        enterKeyHint="search"
      />
      {value && (
        <button
          type="button"
          className={styles.clear}
          aria-label="Clear search"
          onClick={() => {
            setValue("");
            if (current) go("");
          }}
        >
          <XMarkIcon aria-hidden="true" />
        </button>
      )}
    </form>
  );
}
