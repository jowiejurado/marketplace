"use client";

import { ArrowPathIcon, CameraIcon, MapPinIcon, PhotoIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, type DragEvent, type FormEvent } from "react";
import type { FieldErrors } from "@/app/actions";
import { prepareImage } from "@/lib/image";
import { CATEGORIES, DEFAULT_LOCATION, formatPrice, isCategory, isEmail, LIMITS, MAX_IMAGE_BYTES } from "@/lib/shared";
import { useMarket } from "./MarketProvider";
import styles from "./CreateListingForm.module.css";

const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];
const SELLER_KEY = "marketplace-seller-email";

type Photo = { file: File; preview: string };

export function CreateListingForm() {
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
    const p = Number(price.replace(/[$,\s]/g, ""));
    if (!photo) errors.photo = "Add a photo so buyers can see what you’re selling.";
    if (title.trim().length < LIMITS.title[0]) errors.title = "Give it a title of at least 3 characters.";
    if (price.trim() === "" || !Number.isFinite(p) || p < 0) errors.price = "Enter a price, or 0 if it’s free.";
    if (!isCategory(category)) errors.category = "Pick a category.";
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
    publish({
      form: new FormData(event.currentTarget),
      photo: photo!.file,
      preview: photo!.preview,
      draft: {
        title: title.trim(),
        description: description.trim(),
        price: Math.round(Number(price.replace(/[$,\s]/g, "")) * 100) / 100,
        category: category as (typeof CATEGORIES)[number],
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
          <h2 className={styles.cardTitle}>Details</h2>

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

          <div className={styles.row}>
            <label className={styles.field}>
              <span className={styles.label}>Price</span>
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
              {errorFor("price") || <span className={styles.hint}>Enter 0 to give it away for free.</span>}
            </label>

            <label className={styles.field}>
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
            </label>
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
              placeholder="Condition, size, what’s included, pickup times…"
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
            {category && <p className={styles.previewChip}>{category}</p>}
            <p className={styles.previewTitle}>{title.trim() || "Your listing title"}</p>
            <p className={styles.previewMeta}>{location.trim() || "Location"}</p>
            <p className={styles.previewPrice}>{previewPrice}</p>
          </div>
        </div>
        <p className={styles.previewTip}>This is how your listing will look in the Marketplace grid.</p>
      </aside>
    </div>
  );
}
