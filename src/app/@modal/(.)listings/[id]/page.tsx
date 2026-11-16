import { Suspense } from "react";
import { ListingModal } from "@/components/ListingModal";
import { RelatedById, RelatedSkeleton } from "@/components/Related";
import { getListing } from "@/lib/listings";

/** A listing opened from inside the app shows over the feed instead of replacing it. */
export default function ListingModalPage({ params }: { params: Promise<{ id: string }> }) {
  const listing = params.then(({ id }) => getListing(id));

  return (
    // The modal reads the id from the URL, which is request data, so it sits in its own boundary.
    <Suspense>
      <ListingModal listing={listing}>
        <Suspense fallback={<RelatedSkeleton />}>
          <RelatedById params={params} />
        </Suspense>
      </ListingModal>
    </Suspense>
  );
}
