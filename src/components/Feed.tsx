"use client";

import {
  AdjustmentsHorizontalIcon,
  ArrowPathIcon,
  ArrowUpIcon,
  ListBulletIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  Squares2X2Icon,
  TagIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type MouseEvent } from "react";
import { loadListings } from "@/app/actions";
import {
  CATEGORIES,
  feedKey,
  filtersHref,
  filtersToSearch,
  hasActiveFilters,
  matchesFilters,
  PRICES,
  sortListings,
  SORTS,
  type Category,
  type Filters,
  type Listing,
  type ListingPage,
  type PriceRange,
  type Sort,
  type View,
} from "@/lib/shared";
import { CardSkeleton, ListingCard, PendingCard } from "./ListingCard";
import { seenListings, useMarket, useShownFilters } from "./MarketProvider";
import styles from "./Feed.module.css";

/** Plain clicks filter in place; cmd/ctrl-click still opens the link in a new tab. */
function isPlainClick(event: MouseEvent) {
  return !(event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0);
}

const SUGGESTIONS = ["bike", "chair", "guitar", "headphones", "lamp"];

// ---------------------------------------------------------------------------
// Filter panel: categories and price. A sidebar on desktop, a chip row on phones.
// ---------------------------------------------------------------------------

export function FilterPanel({ filters, counts }: { filters: Filters; counts: Partial<Record<Category, number>> }) {
  const { navigate } = useMarket();
  const shown = useShownFilters(filters);
  const total = Object.values(counts).reduce((sum, n) => sum + (n ?? 0), 0);

  const items: { label: string; category?: Category; count: number }[] = [
    { label: "All", count: total },
    ...CATEGORIES.map((category) => ({ label: category, category, count: counts[category] ?? 0 })),
  ];

  // On phones the categories are a sideways-scrolling row; keep the active one in view.
  const panel = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = panel.current;
    const active = el?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!el || !active || el.scrollWidth <= el.clientWidth) return;
    el.scrollTo({ left: active.offsetLeft - el.clientWidth / 2 + active.offsetWidth / 2, behavior: "smooth" });
  }, [shown.category]);

  return (
    <aside ref={panel} className={styles.panel} aria-label="Filters">
      <nav aria-label="Categories">
        <h2 className={styles.panelTitle}>Categories</h2>
        <ul className={styles.categories}>
          {items.map(({ label, category, count }) => {
            const next = { ...shown, category };
            const active = shown.category === category;
            return (
              <li key={label}>
                <Link
                  href={filtersHref(next)}
                  scroll={false}
                  className={styles.category}
                  aria-current={active ? "page" : undefined}
                  onClick={(e) => {
                    if (!isPlainClick(e)) return;
                    e.preventDefault();
                    if (!active) navigate(next);
                  }}
                >
                  <span className={styles.categoryLabel}>{label}</span>
                  {count > 0 && <span className={styles.count}>{count}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <fieldset className={styles.priceGroup}>
        <legend className={styles.panelTitle}>Price</legend>
        {(Object.keys(PRICES) as PriceRange[]).map((price) => (
          <label key={price} className={styles.priceOption}>
            <input
              type="radio"
              name="price"
              value={price}
              checked={shown.price === price}
              onChange={() => navigate({ ...shown, price }, { replace: true })}
            />
            <span>{PRICES[price]}</span>
          </label>
        ))}
      </fieldset>
    </aside>
  );
}

// ---------------------------------------------------------------------------
// Toolbar: heading, count, active filters, sort and view.
// ---------------------------------------------------------------------------

export function FeedToolbar({ filters, total }: { filters: Filters; total: number }) {
  const { navigate, isPending } = useMarket();
  const shown = useShownFilters(filters);
  const updating = feedKey(shown) !== feedKey(filters);

  const chips: { label: string; next: Filters }[] = [];
  if (shown.category) chips.push({ label: shown.category, next: { ...shown, category: undefined } });
  if (shown.q) chips.push({ label: `“${shown.q}”`, next: { ...shown, q: "" } });
  if (shown.price !== "any") chips.push({ label: PRICES[shown.price], next: { ...shown, price: "any" } });

  const setView = (view: View) => navigate({ ...shown, view }, { replace: true, types: ["view"] });

  return (
    <div className={styles.toolbar}>
      <div className={styles.progress} data-active={(isPending && updating) || undefined} aria-hidden="true" />

      <div className={styles.titleRow}>
        <div className={styles.titleBlock}>
          <h1 className={`display ${styles.heading}`}>
            {shown.q ? (
              <>
                Results for <em>“{shown.q}”</em>
              </>
            ) : (
              (shown.category ?? "Today’s picks")
            )}
          </h1>
          <p className={styles.resultCount} aria-live="polite">
            {updating ? "Updating…" : `${total.toLocaleString("en-US")} ${total === 1 ? "listing" : "listings"}`}
            {!updating && shown.q && shown.category && ` in ${shown.category}`}
            {!updating && !hasActiveFilters(shown) && " near Palo Alto"}
          </p>
        </div>

        <div className={styles.controls}>
          <label className={`${styles.select} ${styles.mobileOnly}`}>
            <span className="sr-only">Price</span>
            <TagIcon aria-hidden="true" />
            <select value={shown.price} onChange={(e) => navigate({ ...shown, price: e.target.value as PriceRange }, { replace: true })}>
              {(Object.keys(PRICES) as PriceRange[]).map((price) => (
                <option key={price} value={price}>
                  {PRICES[price]}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.select}>
            <span className="sr-only">Sort by</span>
            <AdjustmentsHorizontalIcon aria-hidden="true" />
            <select value={shown.sort} onChange={(e) => navigate({ ...shown, sort: e.target.value as Sort }, { replace: true })}>
              {(Object.keys(SORTS) as Sort[]).map((sort) => (
                <option key={sort} value={sort}>
                  {SORTS[sort]}
                </option>
              ))}
            </select>
          </label>

          <div className={styles.viewToggle} role="group" aria-label="Layout">
            <button type="button" aria-pressed={shown.view === "grid"} aria-label="Grid view" title="Grid view" onClick={() => setView("grid")}>
              <Squares2X2Icon aria-hidden="true" />
            </button>
            <button type="button" aria-pressed={shown.view === "list"} aria-label="List view" title="List view" onClick={() => setView("list")}>
              <ListBulletIcon aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      {chips.length > 0 && (
        <ul className={styles.chips} aria-label="Active filters">
          {chips.map((chip) => (
            <li key={chip.label}>
              <button type="button" className={styles.chip} onClick={() => navigate(chip.next)} aria-label={`Remove filter ${chip.label}`}>
                {chip.label}
                <XMarkIcon aria-hidden="true" />
              </button>
            </li>
          ))}
          {chips.length > 1 && (
            <li>
              <button
                type="button"
                className={styles.clearAll}
                onClick={() => navigate({ ...shown, category: undefined, q: "", price: "any" })}
              >
                Clear all
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// The feed: instant filtering of what's loaded, then infinite scrolling from the server.
// ---------------------------------------------------------------------------

function merge(first: Listing[], rest: Listing[]) {
  const ids = new Set(first.map((l) => l.id));
  return [...first, ...rest.filter((l) => !ids.has(l.id))];
}

export function FeedList({ filters, initial }: { filters: Filters; initial: ListingPage }) {
  const market = useMarket();
  const shown = useShownFilters(filters);
  const [items, setItems] = useState(initial.items);
  const [total, setTotal] = useState(initial.total);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [prevInitial, setPrevInitial] = useState(initial);
  const sentinel = useRef<HTMLDivElement>(null);

  // Fresh server data for the same filters (e.g. after publishing): keep what's loaded, put the new first page on top.
  if (initial !== prevInitial) {
    setPrevInitial(initial);
    setItems((current) => merge(initial.items, current));
    setTotal(initial.total);
  }

  useEffect(() => {
    for (const listing of items) seenListings.set(listing.id, listing);
  }, [items]);

  const updating = feedKey(shown) !== feedKey(filters);
  const hasMore = items.length < total;
  const search = filtersToSearch({ ...filters, view: "grid" });

  const loadMore = useCallback(async () => {
    setStatus("loading");
    try {
      const page = await loadListings(search, items.length);
      setItems((current) => merge(current, page.items));
      // If the server had nothing new, stop asking.
      setTotal(page.items.length === 0 ? items.length : page.total);
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }, [search, items.length]);

  useEffect(() => {
    const el = sentinel.current;
    if (!el || !hasMore || updating || status !== "idle") return;
    const observer = new IntersectionObserver(([entry]) => entry.isIntersecting && loadMore(), {
      rootMargin: "0px 0px 900px 0px",
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, updating, status, loadMore]);

  // While the server catches up, filter and sort what's already here.
  const visible = updating ? sortListings(items.filter((l) => matchesFilters(l, shown)), shown.sort) : items;
  const pending = market.pending.filter(
    (p) => !(p.realId && items.some((l) => l.id === p.realId)) && matchesFilters(p.listing, shown),
  );
  const view = shown.view;
  const listClass = view === "list" ? styles.list : styles.grid;

  if (visible.length === 0 && pending.length === 0) {
    if (updating) {
      return (
        <ul className={listClass} aria-busy="true" aria-label="Loading listings">
          {Array.from({ length: 8 }, (_, i) => (
            <CardSkeleton key={i} layout={view} />
          ))}
        </ul>
      );
    }
    return <EmptyState filters={shown} />;
  }

  return (
    <>
      <ul className={listClass}>
        {pending.map((item) => (
          <PendingCard key={item.tempId} item={item} layout={view} />
        ))}
        {visible.map((listing, i) => (
          <ListingCard
            key={listing.id}
            listing={listing}
            layout={view}
            eager={i < 8}
            morph
            fresh={market.fresh.has(listing.id)}
          />
        ))}
        {status === "loading" &&
          Array.from({ length: view === "list" ? 2 : 4 }, (_, i) => <CardSkeleton key={`more-${i}`} layout={view} />)}
      </ul>

      <div ref={sentinel} className={styles.sentinel} aria-hidden="true" />

      {!updating && status === "error" && (
        <div className={styles.feedEnd} role="alert">
          <p>Couldn’t load more listings.</p>
          <button type="button" className="btn btn-secondary" onClick={loadMore}>
            <ArrowPathIcon aria-hidden="true" /> Try again
          </button>
        </div>
      )}

      {!updating && !hasMore && items.length > 0 && (
        <div className={styles.feedEnd}>
          <p className={`display ${styles.feedEndTitle}`}>That’s everything{shown.category ? ` in ${shown.category}` : ""}.</p>
          <p>
            You’ve seen all {total} {total === 1 ? "listing" : "listings"}. Got something to sell?
          </p>
          <div className={styles.feedEndActions}>
            <Link href="/create" className="btn btn-primary" transitionTypes={["nav-forward"]}>
              <PlusIcon aria-hidden="true" /> Sell something
            </Link>
            <button type="button" className="btn btn-secondary" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
              <ArrowUpIcon aria-hidden="true" /> Back to top
            </button>
          </div>
        </div>
      )}

      <BackToTop />
    </>
  );
}

function EmptyState({ filters }: { filters: Filters }) {
  const { navigate } = useMarket();
  const { category, q, price } = filters;

  let title = "Nothing listed yet";
  let body = "Be the first to sell something. It takes about a minute.";
  if (q) {
    title = `No results for “${q}”`;
    body = category || price !== "any" ? "Try removing a filter, or check the spelling." : "Check the spelling, or try a broader word.";
  } else if (category && price !== "any") {
    title = `Nothing in ${category} at that price`;
    body = "Try another price range.";
  } else if (category) {
    title = `Nothing in ${category} yet`;
    body = "Be the first to list something here.";
  } else if (price !== "any") {
    title = "Nothing in that price range";
    body = "Try another price range.";
  }

  return (
    <div className={styles.empty}>
      <span className={styles.emptyIcon} aria-hidden="true">
        <MagnifyingGlassIcon />
      </span>
      <h2 className={`display ${styles.emptyTitle}`}>{title}</h2>
      <p>{body}</p>

      <div className={styles.emptyActions}>
        {q && category && (
          <button type="button" className="btn btn-secondary" onClick={() => navigate({ ...filters, category: undefined })}>
            Search all categories
          </button>
        )}
        {price !== "any" && (
          <button type="button" className="btn btn-secondary" onClick={() => navigate({ ...filters, price: "any" })}>
            Any price
          </button>
        )}
        {(q || category) && !(q && category) && price === "any" && (
          <button type="button" className="btn btn-secondary" onClick={() => navigate({ ...filters, q: "", category: undefined })}>
            Browse all listings
          </button>
        )}
        <Link href="/create" className="btn btn-primary" transitionTypes={["nav-forward"]}>
          <PlusIcon aria-hidden="true" /> Sell something
        </Link>
      </div>

      {q && (
        <p className={styles.suggestions}>
          Popular:{" "}
          {SUGGESTIONS.map((word) => (
            <button key={word} type="button" onClick={() => navigate({ ...filters, category: undefined, price: "any", q: word })}>
              {word}
            </button>
          ))}
        </p>
      )}
    </div>
  );
}

function BackToTop() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 1400);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <button
      type="button"
      className={styles.backToTop}
      data-show={show || undefined}
      tabIndex={show ? 0 : -1}
      aria-hidden={!show}
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
    >
      <ArrowUpIcon aria-hidden="true" /> Top
    </button>
  );
}
