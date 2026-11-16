"use client";

import { useSyncExternalStore } from "react";
import { timeAgo } from "@/lib/shared";

const MINUTE = 60_000;
const subscribe = (tick: () => void) => {
  const id = setInterval(tick, MINUTE);
  return () => clearInterval(id);
};
// Changes once a minute, so "5 minutes ago" stays current without churning renders.
const currentMinute = () => Math.floor(Date.now() / MINUTE);
const noMinute = () => null;

/**
 * The current time to the minute, or null while prerendering on the server
 * (the server can't read the clock there).
 */
export function useNow() {
  const minute = useSyncExternalStore(subscribe, currentMinute, noMinute);
  return minute === null ? null : minute * MINUTE;
}

/** True for listings posted in the last six hours. False on the server. */
export function useIsNew(iso: string) {
  const now = useNow();
  return now !== null && now - new Date(iso).getTime() < 6 * 60 * MINUTE;
}

const dateOnly = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
const full = new Intl.DateTimeFormat("en-US", { dateStyle: "long", timeStyle: "short" });

/** "2 hours ago", computed in the browser. The server renders the plain date. */
export function TimeAgo({ iso }: { iso: string }) {
  const now = useNow();
  const date = new Date(iso);
  return (
    <time dateTime={iso} title={now === null ? undefined : full.format(date)}>
      {now === null ? dateOnly.format(date) : timeAgo(iso, now)}
    </time>
  );
}
