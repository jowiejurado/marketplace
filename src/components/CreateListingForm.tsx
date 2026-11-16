"use client";

import { ArrowPathIcon, CameraIcon, MapPinIcon, PhotoIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, type DragEvent, type FormEvent } from "react";
import type { FieldErrors } from "@/app/actions";
import { prepareImage } from "@/lib/image";
import { CATEGORIES, DEFAULT_LOCATION, formatPrice, isCategory, isEmail, LIMITS, MAX_IMAGE_BYTES } from "@/lib/shared";
import { useMarket } from "./MarketProvider";
import styles from "./CreateListingForm.module.css";

export const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];
export const SELLER_KEY = "marketplace-seller-email";

type Photo = { file: File; preview: string };

/** The listing types on /create. Vehicles and homes ask the questions buyers care about and build the title for you. */
export type ListingKind = "item" | "vehicle" | "home";

const HOME_TYPES = ["Apartment", "House", "Townhouse", "Room"] as const;
const THIS_YEAR = new Date().getFullYear();

const num = (value: string) => Number(value.replace(/[$,\s]/g, ""));

export function CreateListingForm({ kind = "item" }: { kind?: ListingKind }) {
  const router = useRouter();
  const { publish } = useMarket();
  // Once handed to the feed, the preview URL belongs to the pending card, so don't revoke it here.
  const handedOff = useRef(false);
  const ids = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const [photo, setPhoto] = useState<Photo | null>(null);
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("");
  const [location, setLocation] = useState(DEFAULT_LOCATION);
  const [description, setDescription] = useState("");
  const [email, setEmail] = useState("");
  const [dragging, setDragging] = useState(false);
  const [fields, setFields] = useState<FieldErrors>({});
  const [busy, setBusy] = useState(false);

  // Vehicle details
  const [year, setYear] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [mileage, setMileage] = useState("");

  // Home details
  const [deal, setDeal] = useState<"sale" | "rent">("rent");
  const [homeType, setHomeType] = useState<(typeof HOME_TYPES)[number]>("Apartment");
  const [beds, setBeds] = useState("");
  const [baths, setBaths] = useState("");

  // What actually gets saved: vehicles and homes build their title, category and the first line of the description.
  const finalTitle =
    kind === "vehicle"
      ? [year.trim(), make.trim(), model.trim()].filter(Boolean).join(" ")
      : kind === "home"
        ? homeType === "Room"
          ? `Room for ${deal}`
          : `${beds.trim() ? `${beds.trim()}-bed ` : ""}${homeType.toLowerCase()} for ${deal}`
        : title.trim();
  const finalCategory = kind === "vehicle" ? "Vehicles" : kind === "home" ? (deal === "rent" ? "Property Rentals" : "Home Sales") : category;
  const facts =
    kind === "vehicle"
      ? mileage.trim() && `Mileage: ${num(mileage).toLocaleString("en-US")} miles`
      : kind === "home"
        ? [homeType, beds.trim() && `${beds.trim()} bed`, baths.trim() && `${baths.trim()} bath`].filter(Boolean).join(" · ")
        : "";
  const finalDescription = [facts, description.trim()].filter(Boolean).join("\n\n");
  const priceLabel = kind === "home" && deal === "rent" ? "Rent per month" : "Price";

  // Sellers usually list more than once; remember their email.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(SELLER_KEY);
      if (saved) setEmail(saved); // eslint-disable-line react-hooks/set-state-in-effect -- restoring a saved value
    } catch {
      // Storage blocked.
    }
  }, []);

  useEffect(() => {
    if (!photo) return;
    const url = photo.preview;
    return () => {
      if (!handedOff.current) URL.revokeObjectURL(url);
    };
  }, [photo]);

  async function pickPhoto(file: File | undefined) {
    if (!file) return;
    clearError("photo");
    if (!ACCEPTED.includes(file.type)) {
      setFields((f) => ({ ...f, photo: "Use a JPG, PNG or WebP photo." }));
      return;
    }
    const prepared = await prepareImage(file);
    if (prepared.size > MAX_IMAGE_BYTES) {
      setFields((f) => ({ ...f, photo: "That photo is over 5 MB. Pick a smaller one." }));
      return;
    }
    setPhoto({ file: prepared, preview: URL.createObjectURL(prepared) });
  }

  function clearError(name: string) {
    setFields((f) => {
      if (!f[name]) return f;
      const next = { ...f };
      delete next[name];
      return next;
    });
  }

  /** Same rules as the server, so people see problems before uploading anything. */
  function validate(): FieldErrors {
    const errors: FieldErrors = {};
    const p = num(price);
    if (!photo) errors.photo = "Add a photo so buyers can see what you’re selling.";
    if (kind === "item" && title.trim().length < LIMITS.title[0]) errors.title = "Give it a title of at least 3 characters.";
    if (kind === "vehicle") {
      const y = Number(year);
      if (!/^\d{4}$/.test(year.trim()) || y < 1900 || y > THIS_YEAR + 1) errors.year = "Enter the year, e.g. 2016.";
      if (!make.trim()) errors.make = "Add the make, e.g. Honda.";
      if (!model.trim()) errors.model = "Add the model, e.g. Civic.";
      if (mileage.trim() && (!Number.isFinite(num(mileage)) || num(mileage) < 0)) errors.mileage = "Enter miles as a number.";
    }
    if (kind === "home" && homeType !== "Room" && !/^\d{1,2}$/.test(beds.trim())) errors.beds = "How many bedrooms?";
    if (kind === "home" && baths.trim() && !/^\d{1,2}(\.5)?$/.test(baths.trim())) errors.baths = "Enter a number, e.g. 1 or 1.5.";
    if (finalTitle.length > LIMITS.title[1]) errors[kind === "item" ? "title" : "model"] = "That’s too long for a title.";
    if (price.trim() === "" || !Number.isFinite(p) || p < 0) errors.price = "Enter a price, or 0 if it’s free.";
    if (!isCategory(finalCategory)) errors.category = "Pick a category.";
    if (finalDescription.length > LIMITS.description) errors.description = "That description is too long.";
    if (location.trim().length < 2) errors.location = "Add where the item is.";
    if (!isEmail(email.trim())) errors.email = "Enter an email buyers can reach you at.";
    return errors;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const errors = validate();
    setFields(errors);
    const firstInvalid = Object.keys(errors)[0];
    if (firstInvalid) {
      const el = formRef.current?.querySelector<HTMLElement>(`[data-field="${firstInvalid}"]`);
      el?.focus();
      el?.scrollIntoView({ block: "center", behavior: "smooth" });
      return;
    }

    try {
      localStorage.setItem(SELLER_KEY, email.trim());
    } catch {
      // Not remembered.
    }

    // Optimistic: the listing appears at the top of the feed straight away and
    // uploads in the background. If it fails, the card offers Try again.
    handedOff.current = true;
    setBusy(true);
    const form = new FormData(event.currentTarget);
    form.set("title", finalTitle);
    form.set("category", finalCategory);
    form.set("description", finalDescription);
    publish({
      form,
      photo: photo!.file,
      preview: photo!.preview,
      draft: {
        title: finalTitle,
        description: finalDescription,
        price: Math.round(num(price) * 100) / 100,
        category: finalCategory as (typeof CATEGORIES)[number],
        seller_email: email.trim().toLowerCase(),
        location: location.trim(),
      },
    });
    router.push("/", { transitionTypes: ["nav-back"] });
  }

  function handleDrop(event: DragEvent) {
    event.preventDefault();
    setDragging(false);
    pickPhoto(event.dataTransfer.files[0]);
  }

  const priceNumber = Number(price.replace(/[$,\s]/g, ""));
  const previewPrice = price.trim() !== "" && Number.isFinite(priceNumber) ? formatPrice(priceNumber) : "Price";

  const fieldProps = (name: string) => ({
    "data-field": name,
    "aria-invalid": fields[name] ? true : undefined,
    "aria-describedby": fields[name] ? `${ids}-${name}-error` : undefined,
  });
  const errorFor = (name: string) =>
    fields[name] && (
      <p className={styles.error} id={`${ids}-${name}-error`}>
        {fields[name]}
      </p>
    );

  return (
    <div className={styles.layout}>
      <form ref={formRef} className={styles.form} onSubmit={handleSubmit} noValidate aria-busy={busy}>
        <input type="text" name="website" tabIndex={-1} autoComplete="off" className={styles.honeypot} aria-hidden="true" />

        {/* ---------- Photo ---------- */}
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Photo</h2>
          <input
            ref={fileRef}
            type="file"
            accept={ACCEPTED.join(",")}
            className="sr-only"
            tabIndex={-1}
            onChange={(e) => pickPhoto(e.target.files?.[0])}
          />
          {photo ? (
            <div className={styles.photoPreview}>
              {/* eslint-disable-next-line @next/next/no-img-element -- local preview before upload */}
              <img src={photo.preview} alt="Your listing photo" />
              <div className={styles.photoActions}>
                <button type="button" onClick={() => fileRef.current?.click()} disabled={busy}>
                  <ArrowPathIcon aria-hidden="true" /> Replace
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPhoto(null);
                    if (fileRef.current) fileRef.current.value = "";
                  }}
                  disabled={busy}
                  aria-label="Remove photo"
                >
                  <XMarkIcon aria-hidden="true" />
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className={styles.dropzone}
              data-dragging={dragging || undefined}
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              {...fieldProps("photo")}
            >
              <span className={styles.dropIcon}>
                <CameraIcon aria-hidden="true" />
              </span>
              <strong>Add a photo</strong>
              <span>or drag and drop · JPG, PNG or WebP, up to 5 MB</span>
            </button>
          )}
          {errorFor("photo")}
        </section>

        {/* ---------- Details ---------- */}
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>
            {kind === "vehicle" ? "Vehicle" : kind === "home" ? "Property" : "Details"}
          </h2>

          {kind === "item" && (
            <label className={styles.field}>
              <span className={styles.label}>Title</span>
              <input
                name="title"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  clearError("title");
                }}
                placeholder="e.g. Trek road bike, 54 cm"
                maxLength={LIMITS.title[1]}
                required
                {...fieldProps("title")}
              />
              {errorFor("title")}
            </label>
          )}

          {kind === "vehicle" && (
            <>
              <div className={styles.row3}>
                <label className={styles.field}>
                  <span className={styles.label}>Year</span>
                  <input
                    value={year}
                    onChange={(e) => {
                      setYear(e.target.value);
                      clearError("year");
                    }}
                    inputMode="numeric"
                    maxLength={4}
                    placeholder={String(THIS_YEAR - 8)}
                    required
                    {...fieldProps("year")}
                  />
                  {errorFor("year")}
                </label>
                <label className={styles.field}>
                  <span className={styles.label}>Make</span>
                  <input
                    value={make}
                    onChange={(e) => {
                      setMake(e.target.value);
                      clearError("make");
                    }}
                    maxLength={30}
                    placeholder="Honda"
                    required
                    {...fieldProps("make")}
                  />
                  {errorFor("make")}
                </label>
                <label className={styles.field}>
                  <span className={styles.label}>Model</span>
                  <input
                    value={model}
                    onChange={(e) => {
                      setModel(e.target.value);
                      clearError("model");
                    }}
                    maxLength={40}
                    placeholder="Civic EX"
                    required
                    {...fieldProps("model")}
                  />
                  {errorFor("model")}
                </label>
              </div>
              <label className={styles.field}>
                <span className={styles.label}>
                  Mileage <span className={styles.optional}>(optional)</span>
                </span>
                <span className={styles.suffixInput}>
                  <input
                    value={mileage}
                    onChange={(e) => {
                      setMileage(e.target.value);
                      clearError("mileage");
                    }}
                    inputMode="numeric"
                    placeholder="68,000"
                    {...fieldProps("mileage")}
                  />
                  <span aria-hidden="true">miles</span>
                </span>
                {errorFor("mileage")}
              </label>
            </>
          )}

          {kind === "home" && (
            <>
              <div className={styles.segmented} role="radiogroup" aria-label="Listing for">
                {(["rent", "sale"] as const).map((option) => (
                  <label key={option}>
                    <input type="radio" name="deal" value={option} checked={deal === option} onChange={() => setDeal(option)} />
                    <span>For {option}</span>
                  </label>
                ))}
              </div>
              <div className={styles.row3}>
                <label className={styles.field}>
                  <span className={styles.label}>Property type</span>
                  <select value={homeType} onChange={(e) => setHomeType(e.target.value as (typeof HOME_TYPES)[number])}>
                    {HOME_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={styles.field}>
                  <span className={styles.label}>Bedrooms</span>
                  <input
                    value={beds}
                    onChange={(e) => {
                      setBeds(e.target.value);
                      clearError("beds");
                    }}
                    inputMode="numeric"
                    maxLength={2}
                    placeholder={homeType === "Room" ? "1" : "2"}
                    disabled={homeType === "Room"}
                    {...fieldProps("beds")}
                  />
                  {errorFor("beds")}
                </label>
                <label className={styles.field}>
                  <span className={styles.label}>
                    Bathrooms <span className={styles.optional}>(optional)</span>
                  </span>
                  <input
                    value={baths}
                    onChange={(e) => {
                      setBaths(e.target.value);
                      clearError("baths");
                    }}
                    inputMode="decimal"
                    maxLength={4}
                    placeholder="1"
                    {...fieldProps("baths")}
                  />
                  {errorFor("baths")}
                </label>
              </div>
            </>
          )}

          <div className={kind === "item" ? styles.row : undefined}>
            <label className={styles.field}>
              <span className={styles.label}>{priceLabel}</span>
              <span className={styles.priceInput}>
                <span aria-hidden="true">$</span>
                <input
                  name="price"
                  value={price}
                  onChange={(e) => {
                    setPrice(e.target.value);
                    clearError("price");
                  }}
                  inputMode="decimal"
                  placeholder="0"
                  required
                  {...fieldProps("price")}
                />
              </span>
              {errorFor("price") ||
                (kind === "item" && <span className={styles.hint}>Enter 0 to give it away for free.</span>)}
            </label>

            {kind === "item" && <label className={styles.field}>
              <span className={styles.label}>Category</span>
              <select
                name="category"
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  clearError("category");
                }}
                required
                {...fieldProps("category")}
              >
                <option value="" disabled>
                  Choose one
                </option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              {errorFor("category")}
            </label>}
          </div>

          <label className={styles.field}>
            <span className={styles.label}>Location</span>
            <span className={styles.iconInput}>
              <MapPinIcon aria-hidden="true" />
              <input
                name="location"
                value={location}
                onChange={(e) => {
                  setLocation(e.target.value);
                  clearError("location");
                }}
                maxLength={LIMITS.location}
                autoComplete="address-level2"
                required
                {...fieldProps("location")}
              />
            </span>
            {errorFor("location")}
          </label>

          <label className={styles.field}>
            <span className={styles.labelRow}>
              <span className={styles.label}>
                Description <span className={styles.optional}>(optional)</span>
              </span>
              <span className={styles.counter} data-low={description.length > LIMITS.description - 100 || undefined}>
                {description.length}/{LIMITS.description}
              </span>
            </span>
            <textarea
              name="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              maxLength={LIMITS.description}
              placeholder={
                kind === "vehicle"
                  ? "Condition, service history, owners, anything that needs fixing…"
                  : kind === "home"
                    ? "Neighbourhood, available from, pets, parking, what’s included…"
                    : "Condition, size, what’s included, pickup times…"
              }
              {...fieldProps("description")}
            />
            {errorFor("description")}
          </label>
        </section>

        {/* ---------- Contact ---------- */}
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Contact</h2>
          <label className={styles.field}>
            <span className={styles.label}>Your email</span>
            <input
              name="email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                clearError("email");
              }}
              autoComplete="email"
              inputMode="email"
              placeholder="you@example.com"
              required
              {...fieldProps("email")}
            />
            {errorFor("email") || (
              <span className={styles.hint}>Shown on your listing so buyers can reach you. Messages also go here.</span>
            )}
          </label>
        </section>

        <div className={styles.submitBar}>
          <p className={styles.submitNote}>Goes live straight away. No account needed.</p>
          <button type="submit" className={`btn btn-primary ${styles.publish}`} disabled={busy}>
            {busy && <span className={styles.spinner} aria-hidden="true" />}
            {busy ? "Publishing…" : "Publish listing"}
          </button>
        </div>
      </form>

      {/* ---------- Live preview ---------- */}
      <aside className={styles.previewCol} aria-label="Preview">
        <p className={styles.previewLabel}>Preview</p>
        <div className={styles.previewCard}>
          <div className={styles.previewImage}>
            {photo ? (
              // eslint-disable-next-line @next/next/no-img-element -- local preview before upload
              <img src={photo.preview} alt="" />
            ) : (
              <PhotoIcon aria-hidden="true" />
            )}
          </div>
          <div className={styles.previewBody}>
            {finalCategory && <p className={styles.previewChip}>{finalCategory}</p>}
            <p className={styles.previewTitle}>{finalTitle || "Your listing title"}</p>
            <p className={styles.previewMeta}>{location.trim() || "Location"}</p>
            <p className={styles.previewPrice}>
              {previewPrice}
              {kind === "home" && deal === "rent" && price.trim() !== "" && " / month"}
            </p>
          </div>
        </div>
        <p className={styles.previewTip}>This is how your listing will look in the Marketplace grid.</p>
      </aside>
    </div>
  );
}
