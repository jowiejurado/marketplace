import { NotFound } from "@/components/NotFound";

export default function ListingNotFound() {
  return (
    <NotFound
      title="This listing isn’t here"
      message="It may have sold, or the link is wrong. Plenty more to look at, though."
    />
  );
}
