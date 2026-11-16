import { PlusIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { Suspense } from "react";
import { SearchBox } from "./SearchBox";
import styles from "./Header.module.css";

export function Header() {
  return (
    <header className={styles.header} style={{ viewTransitionName: "site-header" }}>
      <div className={styles.inner}>
        <Link href="/" className={`display ${styles.logo}`} aria-label="Marketplace home" transitionTypes={["nav-back"]}>
          Marketplace
        </Link>

        <Suspense fallback={<div className={styles.searchFallback} />}>
          <SearchBox />
        </Suspense>

        <div className={styles.end}>
          <Link href="/sell/payouts" className={styles.payouts} transitionTypes={["nav-forward"]}>
            Get paid
          </Link>
          <Link href="/create" className={`btn btn-primary ${styles.sell}`} transitionTypes={["nav-forward"]}>
            <PlusIcon aria-hidden="true" />
            <span>Sell an item</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
