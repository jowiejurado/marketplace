/** The ways to start a listing, shown on /create. Only "item" is built so far; the rest show as coming soon. */
export const LISTING_TYPES = {
  item: {
    title: "Item for sale",
    blurb: "One thing: furniture, electronics, clothes, anything.",
    intro: "Add a photo and a few details. Your listing goes live straight away, no account needed.",
    available: true,
  },
  multiple: {
    title: "Multiple listings",
    blurb: "Clearing out? List several things at once.",
    intro: "",
    available: false,
  },
  vehicle: {
    title: "Vehicle for sale",
    blurb: "Cars, trucks and motorbikes, with year, make, model and mileage.",
    intro: "",
    available: false,
  },
  home: {
    title: "Home for sale or rent",
    blurb: "Apartments, houses and rooms, to rent or to buy.",
    intro: "",
    available: false,
  },
} as const;

export type ListingTypeKey = keyof typeof LISTING_TYPES;

/** True only for types that have a form. */
export function isAvailableType(value: string): value is "item" {
  return value in LISTING_TYPES && LISTING_TYPES[value as ListingTypeKey].available;
}
