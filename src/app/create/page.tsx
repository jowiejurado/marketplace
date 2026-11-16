import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import type { Metadata } from "next";
import Link from "next/link";
import { CreateListingForm } from "@/components/CreateListingForm";
import { PageTransition } from "@/components/PageTransition";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Create a listing",
};

export default function CreatePage() {
  return (
    <PageTransition>
      <main id="main" className={styles.page}>
        <Link href="/" className={styles.back} transitionTypes={["nav-back"]}>
          <ArrowLeftIcon aria-hidden="true" />
          All listings
        </Link>
        <header className={styles.intro}>
          <h1 className="display">Sell something</h1>
          <p>Add a photo and a few details. Your listing goes live straight away, no account needed.</p>
        </header>
        <CreateListingForm />
      </main>
    </PageTransition>
  );
}
