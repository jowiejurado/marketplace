"use client";

import {
  ChatBubbleLeftEllipsisIcon,
  CheckIcon,
  ChevronRightIcon,
  ClockIcon,
  MapPinIcon,
  PhotoIcon,
  ShareIcon,
} from "@heroicons/react/24/outline";
import Image from "next/image";
import Link from "next/link";
import { useState, ViewTransition, type MouseEvent, type ReactNode } from "react";
import { categorySlug, formatPrice, type Listing } from "@/lib/shared";
import { CopyEmail } from "./CopyEmail";
import { MessageSeller } from "./MessageSeller";
import { TimeAgo } from "./TimeAgo";
import styles from "./ListingView.module.css";

// Same `sizes` as a feed card, so the browser reuses the photo it already has
// and the listing opens with a picture straight away; the sharp one fades in on top.
const CARD_SIZES = "(max-width: 640px) 50vw, (max-width: 1200px) 33vw, 300px";

type Props = {
  listing: Listing;
  variant: "modal" | "page";
  titleId?: string;
  related?: ReactNode;
};

/** The listing split view: photo on one side, details and Message Seller on the other. */
export function ListingView({ listing, variant, titleId, related }: Props) {
  const [sharp, setSharp] = useState(false);
  const sellerName = listing.seller_email.split("@")[0];
  const Title = variant === "page" ? "h1" : "h2";

  return (
    <article className={styles.view} data-variant={variant}>
      <div className={styles.gallery}>
        <ViewTransition name={`photo-${listing.id}`} share={{ filter: "none", default: "morph" }} default="none">
          <div className={styles.frame}>
            {listing.image_url ? (
              <>
                <Image src={listing.image_url} alt="" fill sizes={CARD_SIZES} className={styles.backdrop} aria-hidden="true" />
                <Image src={listing.image_url} alt="" fill sizes={CARD_SIZES} className={styles.photo} aria-hidden="true" />
                <Image
                  src={listing.image_url}
                  alt={listing.title}
                  fill
                  sizes={variant === "page" ? "(max-width: 900px) 100vw, 60vw" : "(max-width: 900px) 100vw, 640px"}
                  className={styles.photo}
                  data-sharp={sharp || undefined}
                  onLoad={() => setSharp(true)}
                  preload
                />
              </>
            ) : (
              <PhotoIcon className={styles.noPhoto} aria-hidden="true" />
            )}
          </div>
        </ViewTransition>
      </div>

      <div className={styles.panel} data-scroll>
        <nav className={styles.crumbs} aria-label="Breadcrumb">
          <Link href="/" transitionTypes={variant === "page" ? ["nav-back"] : undefined}>
            Marketplace
          </Link>
          <ChevronRightIcon aria-hidden="true" />
          <Link href={`/?c=${categorySlug(listing.category)}`} transitionTypes={variant === "page" ? ["nav-back"] : undefined}>
            {listing.category}
          </Link>
        </nav>

        <Title id={titleId} className={`display ${styles.title}`}>
          {listing.title}
        </Title>
        <p className={styles.price}>
          {formatPrice(listing.price)}
          {listing.price === 0 && <span className={styles.freeNote}>Just come and get it</span>}
        </p>

        <ul className={styles.facts}>
          <li>
            <MapPinIcon aria-hidden="true" />
            {listing.location}
          </li>
          <li>
            <ClockIcon aria-hidden="true" />
            <span>
              Listed <TimeAgo iso={listing.created_at} />
            </span>
          </li>
        </ul>

        <div className={styles.actions}>
          <a href={`#message-${listing.id}`} className="btn btn-primary" onClick={focusMessage}>
            <ChatBubbleLeftEllipsisIcon aria-hidden="true" />
            Message seller
          </a>
          <ShareButton id={listing.id} title={listing.title} />
        </div>

        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Details</h3>
          <dl className={styles.specs}>
            <div>
              <dt>Category</dt>
              <dd>{listing.category}</dd>
            </div>
            <div>
              <dt>Pickup</dt>
              <dd>{listing.location}</dd>
            </div>
          </dl>
          {listing.description ? (
            <p className={styles.description}>{listing.description}</p>
          ) : (
            <p className={styles.muted}>The seller didn’t add a description.</p>
          )}
        </section>

        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Seller</h3>
          <div className={styles.seller}>
            <span className={styles.avatar} aria-hidden="true">
              {sellerName.slice(0, 1).toUpperCase()}
            </span>
            <div className={styles.sellerText}>
              <p className={styles.sellerName}>{sellerName}</p>
              <CopyEmail email={listing.seller_email} />
            </div>
          </div>
        </section>

        <div id={`message-${listing.id}`} data-message-seller className={styles.message}>
          <MessageSeller listingId={listing.id} listingTitle={listing.title} />
        </div>

        {variant === "modal" && related}
      </div>

      {variant === "page" && related}
    </article>
  );
}

function focusMessage(event: MouseEvent<HTMLAnchorElement>) {
  const target = event.currentTarget.closest("article")?.querySelector<HTMLTextAreaElement>("[data-message-seller] textarea");
  if (!target) return;
  event.preventDefault();
  target.scrollIntoView({ behavior: "smooth", block: "center" });
  target.focus({ preventScroll: true });
}

function ShareButton({ id, title }: { id: string; title: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = `${window.location.origin}/listings/${id}`;
    try {
      if (navigator.share && window.matchMedia("(pointer: coarse)").matches) {
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Share sheet dismissed or clipboard blocked.
    }
  }

  return (
    <button type="button" className="btn btn-secondary" onClick={share}>
      {copied ? <CheckIcon aria-hidden="true" /> : <ShareIcon aria-hidden="true" />}
      <span aria-live="polite">{copied ? "Link copied" : "Share"}</span>
    </button>
  );
}

export function ListingViewSkeleton({ variant }: { variant: "modal" | "page" }) {
  return (
    <div className={styles.view} data-variant={variant} aria-busy="true" aria-label="Loading listing">
      <div className={styles.gallery}>
        <div className={`skeleton ${styles.frame}`} />
      </div>
      <div className={styles.panel} data-scroll>
        <div className={`skeleton ${styles.skelLine}`} style={{ width: "40%" }} />
        <div className={`skeleton ${styles.skelTitle}`} />
        <div className={`skeleton ${styles.skelLine}`} style={{ width: "25%", height: 26 }} />
        <div className={`skeleton ${styles.skelLine}`} style={{ width: "60%" }} />
        <div className={`skeleton ${styles.skelBlock}`} />
      </div>
    </div>
  );
}
