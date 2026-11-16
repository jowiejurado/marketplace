import { Suspense, ViewTransition } from "react";
import { FeedList, FeedToolbar, FilterPanel } from "@/components/Feed";
import { CardSkeleton } from "@/components/ListingCard";
import { PageTransition } from "@/components/PageTransition";
import { getCategoryCounts, getListings } from "@/lib/listings";
import { feedKey, parseFilters } from "@/lib/shared";
import { isConfigured } from "@/lib/supabase";
import styles from "@/components/Feed.module.css";

type SearchParams = PageProps<"/">["searchParams"];

export default function Home({ searchParams }: PageProps<"/">) {
  if (!isConfigured) return <NotConfigured />;

  return (
    <PageTransition>
      <div className={styles.layout}>
        <Suspense fallback={<PanelSkeleton />}>
          <Panel searchParams={searchParams} />
        </Suspense>
        <main id="main" className={styles.main}>
          <Suspense
            fallback={
              <ViewTransition exit="slide-down" default="none">
                <ResultsSkeleton />
              </ViewTransition>
            }
          >
            <Results searchParams={searchParams} />
          </Suspense>
        </main>
      </div>
    </PageTransition>
  );
}

async function Panel({ searchParams }: { searchParams: SearchParams }) {
  const [params, counts] = await Promise.all([searchParams, getCategoryCounts()]);
  return <FilterPanel filters={parseFilters(params)} counts={counts} />;
}

async function Results({ searchParams }: { searchParams: SearchParams }) {
  const filters = parseFilters(await searchParams);
  const { category, q, sort, price } = filters;
  const page = await getListings({ category, q, sort, price });

  return (
    <ViewTransition enter="slide-up" default="none">
      <div>
        <FeedToolbar filters={filters} total={page.total} />
        {/* Context transition: a new result set crossfades in place of the old one. */}
        <ViewTransition key={feedKey(filters)} name="results" share={{ filter: "results", default: "none" }} default="none">
          <div data-results>
            <FeedList filters={filters} initial={page} />
          </div>
        </ViewTransition>
      </div>
    </ViewTransition>
  );
}

function PanelSkeleton() {
  return (
    <aside className={styles.panel} aria-hidden="true">
      <div>
        {Array.from({ length: 10 }, (_, i) => (
          <div key={i} className={`skeleton ${styles.skelPanelLine}`} />
        ))}
      </div>
    </aside>
  );
}

function ResultsSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading listings">
      <div className={styles.toolbar}>
        <div className={`skeleton ${styles.skelTitle}`} />
        <div className={`skeleton ${styles.skelCount}`} />
      </div>
      <ul className={styles.grid}>
        {Array.from({ length: 8 }, (_, i) => (
          <CardSkeleton key={i} />
        ))}
      </ul>
    </div>
  );
}

function NotConfigured() {
  return (
    <main id="main" className={styles.setup}>
      <h1 className="display">Almost there</h1>
      <p>
        Connect Supabase: copy <code>.env.example</code> to <code>.env.local</code>, add your project URL and anon key,
        run <code>supabase/setup.sql</code>, then restart the dev server. The README has the details.
      </p>
    </main>
  );
}
