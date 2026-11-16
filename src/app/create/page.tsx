import { ArrowLeftIcon, ArrowRightIcon, HomeModernIcon, Square2StackIcon, TagIcon, TruckIcon } from "@heroicons/react/24/outline";
import type { Metadata } from "next";
import Link from "next/link";
import { PageTransition } from "@/components/PageTransition";
import { LISTING_TYPES, type ListingTypeKey } from "@/lib/listingTypes";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Create a listing",
};

const ICONS: Record<ListingTypeKey, typeof TagIcon> = {
  item: TagIcon,
  multiple: Square2StackIcon,
  vehicle: TruckIcon,
  home: HomeModernIcon,
};

export default function ChooseListingType() {
  return (
    <PageTransition>
      <main id="main" className={styles.page}>
        <Link href="/" className={styles.back} transitionTypes={["nav-back"]}>
          <ArrowLeftIcon aria-hidden="true" />
          All listings
        </Link>
        <header className={styles.intro}>
          <h1 className="display">Choose listing type</h1>
          <p>
            What are you selling? Pick one to get the right form. Want buyers to pay by card?{" "}
            <Link href="/sell/payouts">Connect Stripe</Link> and your listings get a Buy Now button.
          </p>
        </header>

        <ul className={styles.types}>
          {(Object.keys(LISTING_TYPES) as ListingTypeKey[]).map((key) => {
            const Icon = ICONS[key];
            const type = LISTING_TYPES[key];

            if (!type.available) {
              return (
                <li key={key}>
                  <div className={styles.type} data-soon aria-disabled="true">
                    <Icon className={styles.typeIcon} aria-hidden="true" />
                    <span className={styles.typeTitle}>{type.title}</span>
                    <span className={styles.typeBlurb}>{type.blurb}</span>
                    <span className={styles.soon}>Coming soon</span>
                  </div>
                </li>
              );
            }

            return (
              <li key={key}>
                <Link href={`/create/${key}`} className={styles.type} transitionTypes={["nav-forward"]}>
                  <Icon className={styles.typeIcon} aria-hidden="true" />
                  <span className={styles.typeTitle}>{type.title}</span>
                  <span className={styles.typeBlurb}>{type.blurb}</span>
                  <span className={styles.typeGo} aria-hidden="true">
                    Start <ArrowRightIcon />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </main>
    </PageTransition>
  );
}
