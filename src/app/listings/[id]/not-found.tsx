import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import styles from "./page.module.css";

export default function ListingNotFound() {
  return (
    <main id="main" className={styles.page}>
      <div className={styles.notFound}>
        <MagnifyingGlassIcon aria-hidden="true" />
        <h1>This listing isn’t here</h1>
        <p>It may have sold, or the link is wrong. Plenty more to look at, though.</p>
        <Link href="/">Browse Marketplace</Link>
      </div>
    </main>
  );
}
