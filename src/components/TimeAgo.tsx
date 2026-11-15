"use client";

import { useSyncExternalStore } from "react";
import { timeAgo } from "@/lib/shared";

const MINUTE = 60_000;
const subscribe = (tick: () => void) => {
  const id = setInterval(tick, MINUTE);
  return () => clearInterval(id);
};
// Changes once a minute, so React re-renders "5 minutes ago" without churning.
const currentMinute = () => Math.floor(Date.now() / MINUTE);
const noMinute = () => null;

const dateOnly = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
const full = new Intl.DateTimeFormat("en-US", { dateStyle: "long", timeStyle: "short" });

/**
 * "2 hours ago", computed in the browser. The server can't read the clock while
 * prerendering, so it renders the plain date and the browser swaps in the relative time.
 */
export function TimeAgo({ iso }: { iso: string }) {
  const minute = useSyncExternalStore(subscribe, currentMinute, noMinute);
  const date = new Date(iso);
  return (
    <time dateTime={iso} title={minute === null ? undefined : full.format(date)}>
      {minute === null ? dateOnly.format(date) : timeAgo(iso, minute * MINUTE)}
    </time>
  );
}
