import {
  BriefcaseIcon,
  DevicePhoneMobileIcon,
  FilmIcon,
  GiftIcon,
  HeartIcon,
  HomeIcon,
  HomeModernIcon,
  KeyIcon,
  MusicalNoteIcon,
  NewspaperIcon,
  PuzzlePieceIcon,
  RocketLaunchIcon,
  ShoppingBagIcon,
  SparklesIcon,
  SunIcon,
  TrophyIcon,
  TruckIcon,
  UserGroupIcon,
  WrenchScrewdriverIcon,
} from "@heroicons/react/24/outline";
import type { ComponentType, SVGProps } from "react";
import type { Category } from "@/lib/shared";

type Icon = ComponentType<SVGProps<SVGSVGElement>>;

export const CATEGORY_ICONS: Record<Category, Icon> = {
  Vehicles: TruckIcon,
  "Property Rentals": HomeModernIcon,
  Apparel: ShoppingBagIcon,
  Classifieds: NewspaperIcon,
  Electronics: DevicePhoneMobileIcon,
  Entertainment: FilmIcon,
  Family: UserGroupIcon,
  "Free Stuff": GiftIcon,
  "Garden & Outdoor": SunIcon,
  Hobbies: PuzzlePieceIcon,
  "Home Goods": HomeIcon,
  "Home Improvement": WrenchScrewdriverIcon,
  "Home Sales": KeyIcon,
  "Musical Instruments": MusicalNoteIcon,
  "Office Supplies": BriefcaseIcon,
  "Pet Supplies": HeartIcon,
  "Sporting Goods": TrophyIcon,
  "Toys & Games": RocketLaunchIcon,
};

export const ALL_ICON = SparklesIcon;
