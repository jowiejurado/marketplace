"use server";

import { updateTag } from "next/cache";
import { headers } from "next/headers";
import { emailSeller } from "@/lib/email";
import { getListing } from "@/lib/listings";
import { isCategory, isEmail, LIMITS } from "@/lib/shared";
import { db } from "@/lib/supabase";

export type FieldErrors = Partial<Record<string, string>>;
export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string; fields?: FieldErrors };

const text = (form: FormData, name: string) => String(form.get(name) ?? "").trim();

// Bots fill every field; people never see this one.
const isBot = (form: FormData) => text(form, "website") !== "";

export async function createListing(form: FormData): Promise<ActionResult<{ id: string }>> {
  if (isBot(form)) return { ok: false, error: "Something went wrong. Please try again." };

  const title = text(form, "title");
  const description = text(form, "description");
  const priceRaw = text(form, "price").replace(/[$,\s]/g, "");
  const price = Number(priceRaw);
  const category = text(form, "category");
  const sellerEmail = text(form, "email").toLowerCase();
  const location = text(form, "location");
  const imageUrl = text(form, "image_url");

  const fields: FieldErrors = {};
  if (!imageUrl) fields.photo = "Add a photo so buyers can see what you’re selling.";
  if (title.length < LIMITS.title[0]) fields.title = "Give it a title of at least 3 characters.";
  if (title.length > LIMITS.title[1]) fields.title = `Keep the title under ${LIMITS.title[1]} characters.`;
  if (priceRaw === "" || !Number.isFinite(price) || price < 0) fields.price = "Enter a price, or 0 if it’s free.";
  else if (price > LIMITS.price) fields.price = "That price is too high.";
  if (!isCategory(category)) fields.category = "Pick a category.";
  if (!isEmail(sellerEmail)) fields.email = "Enter an email buyers can reach you at.";
  if (location.length < 2) fields.location = "Add where the item is.";
  if (description.length > LIMITS.description) fields.description = "That description is too long.";

  const storagePrefix = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/listing-images/`;
  if (imageUrl && !imageUrl.startsWith(storagePrefix)) fields.photo = "Upload the photo again.";

  if (Object.keys(fields).length > 0) {
    return { ok: false, error: "Check the highlighted fields.", fields };
  }

  const { data, error } = await db()
    .from("listings")
    .insert({
      title,
      description,
      price: Math.round(price * 100) / 100,
      category,
      seller_email: sellerEmail,
      location,
      image_url: imageUrl,
    })
    .select("id")
    .single();

  if (error || !data) return { ok: false, error: "Your listing didn’t save. Please try again." };

  updateTag("listings");
  return { ok: true, data: { id: data.id } };
}

export async function messageSeller(form: FormData): Promise<ActionResult<{ emailed: boolean }>> {
  if (isBot(form)) return { ok: false, error: "Something went wrong. Please try again." };

  const listingId = text(form, "listing_id");
  const buyerName = text(form, "name");
  const buyerEmail = text(form, "email").toLowerCase();
  const message = text(form, "message");

  const fields: FieldErrors = {};
  if (!buyerName) fields.name = "Add your name.";
  else if (buyerName.length > LIMITS.buyerName) fields.name = "That name is too long.";
  if (!isEmail(buyerEmail)) fields.email = "Enter your email so the seller can reply.";
  if (!message) fields.message = "Write a message to the seller.";
  else if (message.length > LIMITS.message) fields.message = `Keep it under ${LIMITS.message} characters.`;
  if (Object.keys(fields).length > 0) return { ok: false, error: "Check the highlighted fields.", fields };

  const listing = await getListing(listingId);
  if (!listing) return { ok: false, error: "This listing is no longer available." };

  // seller_email is filled in by a database trigger from the listing itself.
  const { error } = await db()
    .from("messages")
    .insert({ listing_id: listing.id, buyer_name: buyerName, buyer_email: buyerEmail, message });

  if (error) return { ok: false, error: "Your message didn’t send. Please try again." };

  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;
  const emailed = await emailSeller(listing, { buyerName, buyerEmail, message }, `${origin}/listings/${listing.id}`);

  return { ok: true, data: { emailed } };
}
