import { ArrowLeftIcon, PlusIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { Suspense } from "react";
import { categorySlug, type Category } from "@/lib/shared";
import { MissingPath } from "./MissingPath";
import styles from "./NotFound.module.css";

const POPULAR: Category[] = ["Electronics", "Home Goods", "Apparel", "Sporting Goods", "Musical Instruments", "Free Stuff"];

type Props = {
  title?: string;
  message?: string;
};

/** Shared "not found" screen: says what happened, then offers the useful ways forward. */
export function NotFound({
  title = "Page not found",
  message = "The link may be old, or the page may have moved. Here are some places to go instead.",
}: Props) {
  return (
    <main id="main" className={styles.page}>
      <div className={styles.panel}>
        <p className={styles.code} aria-hidden="true">
          404
        </p>
        <h1 className={`display ${styles.title}`}>{title}</h1>
        <p className={styles.message}>{message}</p>
        <Suspense>
          <MissingPath className={styles.path} />
        </Suspense>

        <div className={styles.actions}>
          <Link href="/" className="btn btn-primary" transitionTypes={["nav-back"]}>
            <ArrowLeftIcon aria-hidden="true" />
            Browse all listings
          </Link>
          <Link href="/create" className="btn btn-secondary" transitionTypes={["nav-forward"]}>
            <PlusIcon aria-hidden="true" />
            Sell an item
          </Link>
        </div>
      </div>

      <nav className={styles.browse} aria-labelledby="not-found-browse">
        <h2 id="not-found-browse" className={styles.browseTitle}>
          Or browse a category
        </h2>
        <ul>
          {POPULAR.map((category) => (
            <li key={category}>
              <Link href={`/?c=${categorySlug(category)}`} transitionTypes={["nav-back"]}>
                {category}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </main>
  );
}
