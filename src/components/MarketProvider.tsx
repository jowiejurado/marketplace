"use client";

import { CheckCircleIcon, ExclamationTriangleIcon, XMarkIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useOptimistic,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { createListing } from "@/app/actions";
import { filtersHref, IMAGE_BUCKET, type Filters, type Listing } from "@/lib/shared";
import { db } from "@/lib/supabase";
import styles from "./MarketProvider.module.css";

/**
 * Client-side state shared by the header, the feed and the create form:
 * - optimistic filters, so category, price, sort and search respond instantly
 *   while the server fetches the real results
 * - listings being published, shown in the feed before the server has saved them
 * - toasts
 */

/** Listings the visitor has already seen, so a listing opens instantly without waiting on the server. */
export const seenListings = new Map<string, Listing>();

export type PublishJob = {
  form: FormData;
  photo: File;
  preview: string;
  draft: Omit<Listing, "id" | "created_at" | "image_url">;
};

export type PendingListing = {
  tempId: string;
  listing: Listing;
  status: "publishing" | "failed" | "live";
  error?: string;
  realId?: string;
};

type Toast = {
  id: number;
  tone: "success" | "error";
  text: string;
  link?: { href: string; label: string };
  action?: { label: string; run: () => void };
};

type NavigateOptions = { replace?: boolean; types?: string[] };

type Market = {
  optimistic: Filters | null;
  typing: string | null;
  isPending: boolean;
  navigate: (next: Filters, options?: NavigateOptions) => void;
  setTyping: (q: string | null) => void;
  pending: PendingListing[];
  publish: (job: PublishJob) => void;
  retry: (tempId: string) => void;
  discard: (tempId: string) => void;
  fresh: ReadonlySet<string>;
};

const MarketContext = createContext<Market | null>(null);

export function useMarket() {
  const market = use(MarketContext);
  if (!market) throw new Error("useMarket must be used inside <MarketProvider>");
  return market;
}

/** The filters to show right now: what the visitor just picked, ahead of the server. */
export function useShownFilters(actual: Filters): Filters {
  const { optimistic, typing } = useMarket();
  const base = optimistic ?? actual;
  return typing === null ? base : { ...base, q: typing.trim() };
}

export function MarketProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic<Filters | null>(null);
  const [typing, setTyping] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingListing[]>([]);
  const [fresh, setFresh] = useState<ReadonlySet<string>>(new Set());
  const [toasts, setToasts] = useState<Toast[]>([]);
  const jobs = useRef(new Map<string, PublishJob & { imageUrl?: string }>());
  const toastId = useRef(0);
  const retryRef = useRef<(tempId: string) => void>(undefined);

  const dismissToast = useCallback((id: number) => setToasts((all) => all.filter((t) => t.id !== id)), []);

  const toast = useCallback(
    (t: Omit<Toast, "id">) => {
      const id = ++toastId.current;
      setToasts((all) => [...all.slice(-2), { ...t, id }]);
      setTimeout(() => dismissToast(id), t.tone === "error" ? 9000 : 6000);
    },
    [dismissToast],
  );

  const navigate = useCallback(
    (next: Filters, { replace = false, types = ["filter"] }: NavigateOptions = {}) => {
      setTyping(null);
      // New results start at the top of the feed.
      // Hidden copies of earlier pages can stay in the DOM (route cache), so use the visible one.
      const results = [...document.querySelectorAll<HTMLElement>("[data-results]")].find((el) => el.offsetParent);
      if (results) {
        const top = results.getBoundingClientRect().top + window.scrollY - 140;
        if (window.scrollY > top) window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
      }
      startTransition(() => {
        setOptimistic(next);
        const href = filtersHref(next);
        if (replace) router.replace(href, { scroll: false, transitionTypes: types });
        else router.push(href, { scroll: false, transitionTypes: types });
      });
    },
    [router, setOptimistic],
  );

  const run = useCallback(
    async (tempId: string) => {
      const job = jobs.current.get(tempId);
      if (!job) return;
      setPending((all) => all.map((p) => (p.tempId === tempId ? { ...p, status: "publishing", error: undefined } : p)));

      try {
        // The photo only uploads once, even if publishing is retried.
        if (!job.imageUrl) {
          const ext = job.photo.type.split("/")[1].replace("jpeg", "jpg");
          const path = `${crypto.randomUUID()}.${ext}`;
          const upload = await db().storage.from(IMAGE_BUCKET).upload(path, job.photo, {
            contentType: job.photo.type,
            cacheControl: "31536000",
          });
          if (upload.error) throw new Error("The photo didn’t upload. Check your connection and try again.");
          job.imageUrl = db().storage.from(IMAGE_BUCKET).getPublicUrl(path).data.publicUrl;
        }

        job.form.set("image_url", job.imageUrl);
        const result = await createListing(job.form);
        if (!result.ok) {
          const fieldError = Object.values(result.fields ?? {})[0];
          throw new Error(fieldError ?? result.error);
        }

        const realId = result.data.id;
        setPending((all) => all.map((p) => (p.tempId === tempId ? { ...p, status: "live", realId } : p)));
        setFresh((all) => new Set(all).add(realId));
        toast({ tone: "success", text: "Your listing is live.", link: { href: `/listings/${realId}`, label: "View" } });

        setTimeout(() => {
          setPending((all) => all.filter((p) => p.tempId !== tempId));
          URL.revokeObjectURL(job.preview);
          jobs.current.delete(tempId);
        }, 1500);
        setTimeout(() => {
          setFresh((all) => {
            const next = new Set(all);
            next.delete(realId);
            return next;
          });
        }, 8000);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Your listing didn’t save. Please try again.";
        setPending((all) => all.map((p) => (p.tempId === tempId ? { ...p, status: "failed", error: message } : p)));
        toast({
          tone: "error",
          text: "Your listing didn’t publish.",
          action: { label: "Try again", run: () => retryRef.current?.(tempId) },
        });
      }
    },
    [toast],
  );

  useEffect(() => {
    retryRef.current = run;
  }, [run]);

  const publish = useCallback(
    (job: PublishJob) => {
      const tempId = `pending-${crypto.randomUUID()}`;
      jobs.current.set(tempId, job);
      const listing: Listing = { ...job.draft, id: tempId, image_url: job.preview, created_at: new Date().toISOString() };
      setPending((all) => [{ tempId, listing, status: "publishing" }, ...all]);
      run(tempId);
    },
    [run],
  );

  const discard = useCallback((tempId: string) => {
    const job = jobs.current.get(tempId);
    if (job) URL.revokeObjectURL(job.preview);
    jobs.current.delete(tempId);
    setPending((all) => all.filter((p) => p.tempId !== tempId));
  }, []);

  const value = useMemo<Market>(
    () => ({
      optimistic,
      typing,
      isPending,
      navigate,
      setTyping,
      pending,
      publish,
      retry: run,
      discard,
      fresh,
    }),
    [optimistic, typing, isPending, navigate, pending, publish, run, discard, fresh],
  );

  return (
    <MarketContext value={value}>
      {children}
      <div className={styles.toasts} role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={styles.toast} data-tone={t.tone}>
            {t.tone === "success" ? <CheckCircleIcon aria-hidden="true" /> : <ExclamationTriangleIcon aria-hidden="true" />}
            <span className={styles.toastText}>{t.text}</span>
            {t.link && (
              <Link href={t.link.href} className={styles.toastAction} onClick={() => dismissToast(t.id)}>
                {t.link.label}
              </Link>
            )}
            {t.action && (
              <button
                type="button"
                className={styles.toastAction}
                onClick={() => {
                  dismissToast(t.id);
                  t.action?.run();
                }}
              >
                {t.action.label}
              </button>
            )}
            <button type="button" className={styles.toastClose} aria-label="Dismiss" onClick={() => dismissToast(t.id)}>
              <XMarkIcon aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
    </MarketContext>
  );
}
