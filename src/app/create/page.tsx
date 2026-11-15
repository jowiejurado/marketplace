import type { Metadata } from "next";
import { CreateListingForm } from "@/components/CreateListingForm";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Create a listing",
};

export default function CreatePage() {
  return (
    <main id="main" className={styles.page}>
      <header className={styles.intro}>
        <h1>Sell something</h1>
        <p>Add a photo and a few details. Your listing goes live straight away, no account needed.</p>
      </header>
      <CreateListingForm />
    </main>
  );
}
