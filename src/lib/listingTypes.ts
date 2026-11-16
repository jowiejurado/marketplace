/** The four ways to start a listing, shown on /create. */
export const LISTING_TYPES = {
  item: {
    title: "Item for sale",
    blurb: "One thing: furniture, electronics, clothes, anything.",
    heading: "Item for sale",
    intro: "Add a photo and a few details. Your listing goes live straight away, no account needed.",
  },
  multiple: {
    title: "Multiple listings",
    blurb: "Clearing out? Add up to 10 photos and list them all at once.",
    heading: "Multiple listings",
    intro: "Each photo becomes its own listing. Give each a title, price and category, then publish them together.",
  },
  vehicle: {
    title: "Vehicle for sale",
    blurb: "Cars, trucks, motorbikes. Year, make, model and mileage.",
    heading: "Vehicle for sale",
    intro: "Tell buyers the year, make and model. We’ll write the title for you.",
  },
  home: {
    title: "Home for sale or rent",
    blurb: "Apartments, houses and rooms, to rent or to buy.",
    heading: "Home for sale or rent",
    intro: "Pick rent or sale, the type of place and how many bedrooms. We’ll write the title for you.",
  },
} as const;

export type ListingTypeKey = keyof typeof LISTING_TYPES;

export function isListingType(value: string): value is ListingTypeKey {
  return value in LISTING_TYPES;
}
