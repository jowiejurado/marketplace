import Link from "next/link";
import styles from "./page.module.css";

export default function ListingNotFound() {
  return (
    <main id="main" className={styles.page}>
      <div className={styles.notFound}>
        <h1 className="display">This listing isn’t here</h1>
        <p>It may have sold, or the link is wrong. Plenty more to look at, though.</p>
        <Link href="/" className="btn btn-primary" transitionTypes={["nav-back"]}>
          Browse Marketplace
        </Link>
      </div>
    </main>
  );
}
