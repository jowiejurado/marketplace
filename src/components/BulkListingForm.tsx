"use client";

import { CameraIcon, MapPinIcon, PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, type DragEvent, type FormEvent } from "react";
import type { FieldErrors } from "@/app/actions";
import { prepareImage } from "@/lib/image";
import { CATEGORIES, DEFAULT_LOCATION, isCategory, isEmail, LIMITS, MAX_IMAGE_BYTES, type Category } from "@/lib/shared";
import { ACCEPTED, SELLER_KEY } from "./CreateListingForm";
import { useMarket } from "./MarketProvider";
import styles from "./CreateListingForm.module.css";

const MAX_ITEMS = 10;

type Row = { id: string; file: File; preview: string; title: string; price: string; category: Category | "" };

const num = (value: string) => Number(value.replace(/[$,\s]/g, ""));

/**
 * List several things at once: one photo per listing, a title, price and category for each,
 * and the location and email shared by all of them. Each one publishes optimistically.
 */
export function BulkListingForm() {
  const router = useRouter();
  const { publish } = useMarket();
  const ids = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const handedOff = useRef(false);
  const rowsRef = useRef<Row[]>([]);

  const [rows, setRows] = useState<Row[]>([]);
  const [location, setLocation] = useState(DEFAULT_LOCATION);
  const [email, setEmail] = useState("");
  const [fields, setFields] = useState<FieldErrors>({});
  const [notice, setNotice] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    rowsRef.current = rows;
  }, [rows]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(SELLER_KEY);
      if (saved) setEmail(saved); // eslint-disable-line react-hooks/set-state-in-effect -- restoring a saved value
    } catch {
      // Storage blocked.
    }
    // Free the previews of anything not handed to the feed.
    return () => {
      if (!handedOff.current) for (const row of rowsRef.current) URL.revokeObjectURL(row.preview);
    };
  }, []);

  async function addFiles(list: FileList | File[] | null | undefined) {
    const files = [...(list ?? [])];
    if (files.length === 0) return;
    setNotice(null);
    clearError("photos");

    const room = MAX_ITEMS - rows.length;
    const usable = files.filter((f) => ACCEPTED.includes(f.type));
    const skipped: string[] = [];
    if (usable.length < files.length) skipped.push("some files weren’t JPG, PNG or WebP");
    if (usable.length > room) skipped.push(`only ${MAX_ITEMS} listings fit in one go`);

    const prepared = await Promise.all(usable.slice(0, room).map(prepareImage));
    const fits = prepared.filter((f) => f.size <= MAX_IMAGE_BYTES);
    if (fits.length < prepared.length) skipped.push("photos over 5 MB were left out");

    const lastCategory = rows.at(-1)?.category ?? "";
    setRows((current) => [
      ...current,
      ...fits.map((file) => ({
        id: crypto.randomUUID(),
        file,
        preview: URL.createObjectURL(file),
        title: "",
        price: "",
        category: lastCategory,
      })),
    ]);
    if (skipped.length) setNotice(`Heads up: ${skipped.join(", ")}.`);
    if (fileRef.current) fileRef.current.value = "";
  }

  function update(id: string, change: Partial<Row>) {
    setRows((current) => current.map((r) => (r.id === id ? { ...r, ...change } : r)));
    for (const key of Object.keys(change)) clearError(`${id}.${key}`);
  }

  function remove(id: string) {
    setRows((current) => {
      const row = current.find((r) => r.id === id);
      if (row) URL.revokeObjectURL(row.preview);
      return current.filter((r) => r.id !== id);
    });
  }

  function clearError(name: string) {
    setFields((f) => {
      if (!f[name]) return f;
      const next = { ...f };
      delete next[name];
      return next;
    });
  }

  function validate(): FieldErrors {
    const errors: FieldErrors = {};
    if (rows.length === 0) errors.photos = "Add at least one photo. Each photo becomes a listing.";
    for (const row of rows) {
      const p = num(row.price);
      if (row.title.trim().length < LIMITS.title[0]) errors[`${row.id}.title`] = "Add a title.";
      if (row.price.trim() === "" || !Number.isFinite(p) || p < 0 || p > LIMITS.price) errors[`${row.id}.price`] = "Enter a price, or 0.";
      if (!isCategory(row.category)) errors[`${row.id}.category`] = "Pick a category.";
    }
    if (location.trim().length < 2) errors.location = "Add where the items are.";
    if (!isEmail(email.trim())) errors.email = "Enter an email buyers can reach you at.";
    return errors;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
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

    handedOff.current = true;
    setBusy(true);
    const honeypot = String(new FormData(event.currentTarget).get("website") ?? "");

    // They upload side by side; each shows in the feed straight away and retries on its own if it fails.
    for (const row of rows) {
      const form = new FormData();
      form.set("website", honeypot);
      form.set("title", row.title.trim());
      form.set("description", "");
      form.set("price", row.price);
      form.set("category", row.category);
      form.set("location", location.trim());
      form.set("email", email.trim());
      publish({
        form,
        photo: row.file,
        preview: row.preview,
        draft: {
          title: row.title.trim(),
          description: "",
          price: Math.round(num(row.price) * 100) / 100,
          category: row.category as Category,
          seller_email: email.trim().toLowerCase(),
          location: location.trim(),
        },
      });
    }
    router.push("/", { transitionTypes: ["nav-back"] });
  }

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

  function handleDrop(event: DragEvent) {
    event.preventDefault();
    setDragging(false);
    addFiles(event.dataTransfer.files);
  }

  const dropProps = {
    onDragOver: (e: DragEvent) => {
      e.preventDefault();
      setDragging(true);
    },
    onDragLeave: () => setDragging(false),
    onDrop: handleDrop,
  };

  return (
    <form ref={formRef} className={styles.form} onSubmit={handleSubmit} noValidate aria-busy={busy}>
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className={styles.honeypot} aria-hidden="true" />
      <input
        ref={fileRef}
        type="file"
        accept={ACCEPTED.join(",")}
        multiple
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => addFiles(e.target.files)}
      />

      <section className={styles.card} {...dropProps}>
        <div className={styles.labelRow}>
          <h2 className={styles.cardTitle}>Listings</h2>
          {rows.length > 0 && (
            <p className={styles.bulkCount}>
              {rows.length} of {MAX_ITEMS}
            </p>
          )}
        </div>

        {rows.length === 0 ? (
          <button
            type="button"
            className={styles.dropzone}
            data-dragging={dragging || undefined}
            onClick={() => fileRef.current?.click()}
            {...fieldProps("photos")}
          >
            <span className={styles.dropIcon}>
              <CameraIcon aria-hidden="true" />
            </span>
            <strong>Add photos</strong>
            <span>One photo per listing, up to {MAX_ITEMS} · or drag and drop them here</span>
          </button>
        ) : (
          <ul className={styles.bulkList}>
            {rows.map((row, i) => (
              <li key={row.id} className={styles.bulkRow}>
                <div className={styles.bulkThumb}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- local preview before upload */}
                  <img src={row.preview} alt={`Photo ${i + 1}`} />
                </div>
                <div className={styles.bulkFields}>
                  <label className={styles.field}>
                    <span className={styles.label}>Title</span>
                    <input
                      value={row.title}
                      onChange={(e) => update(row.id, { title: e.target.value })}
                      maxLength={LIMITS.title[1]}
                      placeholder="What is it?"
                      {...fieldProps(`${row.id}.title`)}
                    />
                    {errorFor(`${row.id}.title`)}
                  </label>
                  <label className={styles.field}>
                    <span className={styles.label}>Category</span>
                    <select
                      value={row.category}
                      onChange={(e) => update(row.id, { category: e.target.value as Category })}
                      {...fieldProps(`${row.id}.category`)}
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
                    {errorFor(`${row.id}.category`)}
                  </label>
                  <label className={styles.field}>
                    <span className={styles.label}>Price</span>
                    <span className={styles.priceInput}>
                      <span aria-hidden="true">$</span>
                      <input
                        value={row.price}
                        onChange={(e) => update(row.id, { price: e.target.value })}
                        inputMode="decimal"
                        placeholder="0"
                        {...fieldProps(`${row.id}.price`)}
                      />
                    </span>
                    {errorFor(`${row.id}.price`)}
                  </label>
                </div>
                <button type="button" className={styles.bulkRemove} onClick={() => remove(row.id)} aria-label={`Remove listing ${i + 1}`}>
                  <XMarkIcon aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}

        {rows.length > 0 && rows.length < MAX_ITEMS && (
          <button type="button" className={`btn btn-secondary ${styles.bulkAdd}`} onClick={() => fileRef.current?.click()}>
            <PlusIcon aria-hidden="true" /> Add more photos
          </button>
        )}
        {notice && (
          <p className={styles.hint} role="status">
            {notice}
          </p>
        )}
        {errorFor("photos")}
      </section>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>For all listings</h2>
        <div className={styles.row}>
          <label className={styles.field}>
            <span className={styles.label}>Location</span>
            <span className={styles.iconInput}>
              <MapPinIcon aria-hidden="true" />
              <input
                value={location}
                onChange={(e) => {
                  setLocation(e.target.value);
                  clearError("location");
                }}
                maxLength={LIMITS.location}
                autoComplete="address-level2"
                {...fieldProps("location")}
              />
            </span>
            {errorFor("location")}
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Your email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                clearError("email");
              }}
              autoComplete="email"
              inputMode="email"
              placeholder="you@example.com"
              {...fieldProps("email")}
            />
            {errorFor("email")}
          </label>
        </div>
        <span className={styles.hint}>No descriptions needed here: buyers can message you with questions.</span>
      </section>

      <div className={styles.submitBar}>
        <p className={styles.submitNote}>Each one goes live straight away.</p>
        <button type="submit" className={`btn btn-primary ${styles.publish}`} disabled={busy}>
          {busy && <span className={styles.spinner} aria-hidden="true" />}
          {busy ? "Publishing…" : rows.length > 1 ? `Publish ${rows.length} listings` : "Publish listing"}
        </button>
      </div>
    </form>
  );
}
