import { ListBulletIcon, MagnifyingGlassIcon, PlusIcon, Squares2X2Icon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { Suspense } from "react";
import { ALL_ICON, CATEGORY_ICONS } from "@/components/categoryIcons";
import { ListingCard } from "@/components/ListingCard";
import { getCategoryCounts, getListings } from "@/lib/listings";
import { CATEGORIES, categoryFromSlug, categorySlug, type Category } from "@/lib/shared";
import { isConfigured } from "@/lib/supabase";
import styles from "./page.module.css";

type Filters = { category?: Category; q: string; view: "grid" | "list" };

async function readFilters(searchParams: PageProps<"/">["searchParams"]): Promise<Filters> {
  const params = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
  return {
    category: categoryFromSlug(one(params.c)),
    q: one(params.q).trim().slice(0, 80),
    view: one(params.view) === "list" ? "list" : "grid",
  };
}

/** Builds a home URL that keeps the other filters. */
function href(filters: Filters, change: Partial<Filters>) {
  const next = { ...filters, ...change };
  const params = new URLSearchParams();
  if (next.category) params.set("c", categorySlug(next.category));
  if (next.q) params.set("q", next.q);
  if (next.view === "list") params.set("view", "list");
  const qs = params.toString();
  return qs ? `/?${qs}` : "/";
}

export default function Home({ searchParams }: PageProps<"/">) {
  if (!isConfigured) return <NotConfigured />;

  return (
    <div className={styles.layout}>
      <Suspense fallback={<nav className={styles.sidebar} aria-label="Categories" />}>
        <CategoryNav searchParams={searchParams} />
      </Suspense>
      <main id="main" className={styles.main}>
        <Suspense fallback={<ResultsSkeleton />}>
          <Results searchParams={searchParams} />
        </Suspense>
      </main>
    </div>
  );
}

async function CategoryNav({ searchParams }: { searchParams: PageProps<"/">["searchParams"] }) {
  const [filters, counts] = await Promise.all([readFilters(searchParams), getCategoryCounts()]);
  const total = Object.values(counts).reduce((sum, n) => sum + (n ?? 0), 0);

  const items: { label: string; category?: Category; count: number }[] = [
    { label: "Browse all", count: total },
    ...CATEGORIES.map((category) => ({ label: category, category, count: counts[category] ?? 0 })),
  ];

  return (
    <nav className={styles.sidebar} aria-label="Categories">
      <h2 className={styles.sidebarTitle}>Categories</h2>
      <ul className={styles.categories}>
        {items.map(({ label, category, count }) => {
          const Icon = category ? CATEGORY_ICONS[category] : ALL_ICON;
          const active = filters.category === category;
          return (
            <li key={label}>
              <Link
                href={href(filters, { category })}
                className={styles.category}
                aria-current={active ? "page" : undefined}
                scroll={false}
              >
                <span className={styles.categoryIcon}>
                  <Icon aria-hidden="true" />
                </span>
                <span className={styles.categoryLabel}>{label}</span>
                {count > 0 && <span className={styles.count}>{count}</span>}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

async function Results({ searchParams }: { searchParams: PageProps<"/">["searchParams"] }) {
  const filters = await readFilters(searchParams);
  const listings = await getListings({ category: filters.category, q: filters.q || undefined });

  const heading = filters.q
    ? `Results for “${filters.q}”`
    : filters.category ?? "Today’s picks";

  return (
    <>
      <div className={styles.toolbar}>
        <div>
          <h1 className={styles.heading}>{heading}</h1>
          <p className={styles.subheading} aria-live="polite">
            {listings.length === 1 ? "1 listing" : `${listings.length} listings`}
            {filters.q && filters.category && ` in ${filters.category}`}
            {filters.q && (
              <>
                {" · "}
                <Link href={href(filters, { q: "" })}>Clear search</Link>
              </>
            )}
          </p>
        </div>

        <div className={styles.viewToggle} role="group" aria-label="Layout">
          <Link
            href={href(filters, { view: "grid" })}
            aria-current={filters.view === "grid" ? "true" : undefined}
            aria-label="Grid view"
            title="Grid view"
            scroll={false}
          >
            <Squares2X2Icon aria-hidden="true" />
          </Link>
          <Link
            href={href(filters, { view: "list" })}
            aria-current={filters.view === "list" ? "true" : undefined}
            aria-label="List view"
            title="List view"
            scroll={false}
          >
            <ListBulletIcon aria-hidden="true" />
          </Link>
        </div>
      </div>

      {listings.length === 0 ? (
        <div className={styles.empty}>
          <MagnifyingGlassIcon className={styles.emptyIcon} aria-hidden="true" />
          <h2>{filters.q ? "No matches" : "Nothing here yet"}</h2>
          <p>
            {filters.q
              ? "Try a different word, or search all categories."
              : `Be the first to list something${filters.category ? ` in ${filters.category}` : ""}.`}
          </p>
          <div className={styles.emptyActions}>
            {filters.q && filters.category && (
              <Link href={href(filters, { category: undefined })} className={styles.secondaryButton}>
                Search all categories
              </Link>
            )}
            <Link href="/create" className={styles.primaryButton}>
              <PlusIcon aria-hidden="true" /> Sell something
            </Link>
          </div>
        </div>
      ) : (
        <ul className={filters.view === "list" ? styles.list : styles.grid}>
          {listings.map((listing, i) => (
            <ListingCard key={listing.id} listing={listing} layout={filters.view} eager={i < 5} />
          ))}
        </ul>
      )}
    </>
  );
}

function ResultsSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading listings">
      <div className={styles.toolbar}>
        <div>
          <div className={`skeleton ${styles.skelHeading}`} />
          <div className={`skeleton ${styles.skelLine}`} />
        </div>
      </div>
      <ul className={styles.grid}>
        {Array.from({ length: 10 }, (_, i) => (
          <li key={i}>
            <div className={`skeleton ${styles.skelImage}`} />
            <div className={`skeleton ${styles.skelLine}`} />
            <div className={`skeleton ${styles.skelLineShort}`} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function NotConfigured() {
  return (
    <main id="main" className={styles.setup}>
      <h1>Almost there</h1>
      <p>
        Connect Supabase: copy <code>.env.example</code> to <code>.env.local</code>, add your project URL and anon key,
        run <code>supabase/setup.sql</code>, then restart the dev server. The README has the details.
      </p>
    </main>
  );
}
