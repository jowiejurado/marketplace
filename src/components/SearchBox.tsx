"use client";

import { MagnifyingGlassIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { parseFilters } from "@/lib/shared";
import { useMarket } from "./MarketProvider";
import styles from "./Header.module.css";

const DEBOUNCE_MS = 350;

/**
 * On the home page the feed filters as you type (instantly on what's loaded),
 * then asks the server once you pause. Elsewhere, Enter searches.
 */
export function SearchBox() {
  const { navigate, setTyping, isPending, typing } = useMarket();
  const pathname = usePathname();
  const params = useSearchParams();
  const onHome = pathname === "/";
  const current = onHome ? (params.get("q") ?? "") : "";

  const [value, setValue] = useState(current);
  const [synced, setSynced] = useState(current);
  const [sent, setSent] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const latest = useRef({ onHome, params });
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    latest.current = { onHome, params };
  });

  // Follow the URL (back button, clearing a filter chip), unless it's just catching up with our own typing.
  if (current !== synced) {
    setSynced(current);
    if (current !== sent) setValue(current);
  }

  function search(q: string, replace: boolean) {
    clearTimeout(timer.current);
    const { onHome: home, params: p } = latest.current;
    const base = home ? parseFilters(p) : parseFilters(new URLSearchParams());
    setSent(q.trim());
    navigate({ ...base, q: q.trim() }, { replace, types: home ? ["filter"] : ["nav-back"] });
  }

  function handleChange(next: string) {
    setValue(next);
    if (!onHome) return;
    setTyping(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if (latest.current.onHome) search(next, true);
    }, DEBOUNCE_MS);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    search(value, false);
    input.current?.blur();
  }

  useEffect(() => () => clearTimeout(timer.current), []);

  // "/" jumps to search, like most shops.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement;
      if (event.key !== "/" || target.closest("input, textarea, select, [contenteditable]")) return;
      event.preventDefault();
      input.current?.focus();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const searching = onHome && isPending && (typing !== null || sent !== null) && value.trim() !== "";

  return (
    <form role="search" className={styles.search} onSubmit={handleSubmit}>
      <MagnifyingGlassIcon className={styles.searchIcon} aria-hidden="true" />
      <label htmlFor="site-search" className="sr-only">
        Search listings
      </label>
      <input
        ref={input}
        id="site-search"
        type="search"
        placeholder="Search the marketplace"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape" && value) {
            e.preventDefault();
            handleChange("");
            if (onHome) search("", true);
          }
        }}
        autoComplete="off"
        enterKeyHint="search"
      />
      {searching && <span className={styles.searchSpinner} aria-hidden="true" />}
      {value ? (
        <button
          type="button"
          className={styles.clear}
          aria-label="Clear search"
          onClick={() => {
            setValue("");
            if (onHome) search("", true);
            input.current?.focus();
          }}
        >
          <XMarkIcon aria-hidden="true" />
        </button>
      ) : (
        <kbd className={styles.kbd} aria-hidden="true">
          /
        </kbd>
      )}
    </form>
  );
}
