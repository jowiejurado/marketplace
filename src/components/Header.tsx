import { PlusIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { Suspense } from "react";
import { SearchBox } from "./SearchBox";
import styles from "./Header.module.css";

export function Header() {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link href="/" className={styles.logo} aria-label="Marketplace home">
          <span className={styles.logoMark} aria-hidden="true">
            m
          </span>
          <span className={styles.logoText}>marketplace</span>
        </Link>

        <Suspense fallback={<div className={styles.searchFallback} />}>
          <SearchBox />
        </Suspense>

        <Link href="/create" className={styles.sell}>
          <PlusIcon aria-hidden="true" />
          <span>Sell something</span>
        </Link>
      </div>
    </header>
  );
}
