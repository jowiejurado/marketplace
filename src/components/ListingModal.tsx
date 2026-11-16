"use client";

import { ArrowTopRightOnSquareIcon, XMarkIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Suspense, use, useCallback, useEffect, useId, useRef, ViewTransition, type ReactNode } from "react";
import type { Listing } from "@/lib/shared";
import { ListingView, ListingViewSkeleton } from "./ListingView";
import { seenListings } from "./MarketProvider";
import styles from "./ListingModal.module.css";

type Props = {
  /** Resolved on the server; only waited on if the visitor hasn't seen this listing in the feed. */
  listing: Promise<Listing | null>;
  /** "More in this category", streamed in from the server. */
  children: ReactNode;
};

/**
 * Opening a listing from the feed shows it here, over the feed, so closing it
 * drops you back exactly where you were. The URL is the listing's own, so
 * refreshing or sharing it opens the full page.
 */
export function ListingModal(props: Props) {
  const params = useParams<{ id?: string }>();
  // The slot can briefly outlive the URL while navigating away; only render for a listing URL.
  if (!params?.id) return null;
  return <ModalSheet key="sheet" id={params.id} {...props} />;
}

function ModalSheet({ id, listing, children }: Props & { id: string }) {
  const router = useRouter();
  const sheet = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const close = useCallback(() => router.back(), [router]);

  useEffect(() => {
    const page = document.getElementById("page");
    const root = document.documentElement;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = root.style.overflow;

    // Everything behind the sheet is out of reach until it closes.
    page?.setAttribute("inert", "");
    root.style.overflow = "hidden";
    sheet.current?.focus({ preventScroll: true });

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);

    return () => {
      page?.removeAttribute("inert");
      root.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
      previousFocus?.focus({ preventScroll: true });
    };
  }, [close]);

  // A new listing opened from "More in this category" starts at the top.
  useEffect(() => {
    sheet.current?.querySelector("[data-scroll]")?.scrollTo({ top: 0 });
    sheet.current?.scrollTo({ top: 0 });
  }, [id]);

  return (
    <div className={styles.overlay}>
      <ViewTransition enter="backdrop-in" exit="backdrop-out" default="none">
        <div className={styles.backdrop} onClick={close} aria-hidden="true" />
      </ViewTransition>

      <ViewTransition enter="sheet-in" exit="sheet-out" default="none">
        <div ref={sheet} className={styles.sheet} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}>
          <div className={styles.bar}>
            <a href={`/listings/${id}`} className={styles.barButton}>
              <ArrowTopRightOnSquareIcon aria-hidden="true" />
              <span>Open full page</span>
            </a>
            <button type="button" className={styles.barButton} onClick={close} aria-label="Close">
              <XMarkIcon aria-hidden="true" />
            </button>
          </div>

          <Suspense fallback={<ListingViewSkeleton variant="modal" />}>
            <ModalBody key={id} id={id} listing={listing} titleId={titleId}>
              {children}
            </ModalBody>
          </Suspense>
        </div>
      </ViewTransition>
    </div>
  );
}

function ModalBody({ id, listing, titleId, children }: { id: string; titleId: string } & Props) {
  // Seen in the feed: open instantly (and let the photo morph). Otherwise wait for the server.
  const data = seenListings.get(id) ?? use(listing);

  if (!data) {
    return (
      <div className={styles.missing}>
        <h2 id={titleId} className="display">
          This listing isn’t here
        </h2>
        <p>It may have sold, or the link is wrong.</p>
        <Link href="/" className="btn btn-primary">
          Browse Marketplace
        </Link>
      </div>
    );
  }

  return <ListingView listing={data} variant="modal" titleId={titleId} related={children} />;
}
