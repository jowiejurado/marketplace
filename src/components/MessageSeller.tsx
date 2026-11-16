"use client";

import { CheckIcon, PaperAirplaneIcon } from "@heroicons/react/24/outline";
import { useEffect, useId, useState, type FormEvent } from "react";
import { messageSeller, type FieldErrors } from "@/app/actions";
import { isEmail, LIMITS } from "@/lib/shared";
import styles from "./MessageSeller.module.css";

const QUICK_REPLIES = ["Is this still available?", "Is the price negotiable?", "When can I pick it up?"];
const BUYER_KEY = "marketplace-buyer";

type Sent = { message: string; email: string; state: "sending" | "delivered"; emailed?: boolean };

export function MessageSeller({ listingId, listingTitle }: { listingId: string; listingTitle: string }) {
  const [message, setMessage] = useState("Hi, is this still available?");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [fields, setFields] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<Sent | null>(null);
  const ids = useId();

  // Remember the buyer's name and email for the next listing they message.
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(BUYER_KEY) ?? "null");
      if (saved?.name) setName(saved.name); // eslint-disable-line react-hooks/set-state-in-effect -- restoring saved values
      if (saved?.email) setEmail(saved.email);
    } catch {
      // Nothing saved, or storage blocked.
    }
  }, []);

  function validate(): FieldErrors {
    const errors: FieldErrors = {};
    if (!message.trim()) errors.message = "Write a message to the seller.";
    if (!name.trim()) errors.name = "Add your name.";
    if (!isEmail(email.trim())) errors.email = "Enter your email so the seller can reply.";
    return errors;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const errors = validate();
    setFields(errors);
    setError(null);
    if (Object.keys(errors).length > 0) return;

    const form = new FormData(event.currentTarget);
    // Optimistic: show the message as sent right away, and roll back if the server says no.
    setSent({ message: message.trim(), email: email.trim(), state: "sending" });

    try {
      const result = await messageSeller(form);
      if (!result.ok) {
        setSent(null);
        setFields(result.fields ?? {});
        setError(result.error);
        return;
      }
      setSent({ message: message.trim(), email: email.trim(), state: "delivered", emailed: result.data.emailed });
      try {
        localStorage.setItem(BUYER_KEY, JSON.stringify({ name: name.trim(), email: email.trim() }));
      } catch {
        // Not remembered; the message still sent.
      }
    } catch {
      setSent(null);
      setError("Your message didn’t send. Check your connection and try again.");
    }
  }

  if (sent) {
    return (
      <section className={styles.card} aria-labelledby={`${ids}-heading`}>
        <h3 id={`${ids}-heading`} className={styles.heading}>
          {sent.state === "sending" ? "Sending your message…" : "Message sent"}
        </h3>
        <div className={styles.thread}>
          <p className={styles.bubble} data-state={sent.state}>
            {sent.message}
          </p>
          <p className={styles.receipt} role="status">
            {sent.state === "sending" ? (
              "Sending…"
            ) : (
              <>
                <CheckIcon aria-hidden="true" />
                Delivered{sent.emailed ? " · seller emailed" : ""}
              </>
            )}
          </p>
        </div>
        {sent.state === "delivered" && (
          <>
            <p className={styles.note}>
              The seller will reply to <strong>{sent.email}</strong>.
            </p>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setMessage("");
                setSent(null);
              }}
            >
              Send another message
            </button>
          </>
        )}
      </section>
    );
  }

  const fieldError = (key: string) =>
    fields[key] && (
      <p className={styles.fieldError} id={`${ids}-${key}-error`}>
        {fields[key]}
      </p>
    );
  const describedBy = (key: string) => (fields[key] ? `${ids}-${key}-error` : undefined);

  return (
    <section className={styles.card} aria-labelledby={`${ids}-heading`}>
      <h3 id={`${ids}-heading`} className={styles.heading}>
        Send the seller a message
      </h3>

      <form onSubmit={handleSubmit} className={styles.form} noValidate>
        <input type="hidden" name="listing_id" value={listingId} />
        {/* Honeypot: hidden from people, tempting to bots. */}
        <input type="text" name="website" tabIndex={-1} autoComplete="off" className={styles.honeypot} aria-hidden="true" />

        <div className={styles.quick} role="group" aria-label="Quick messages">
          {QUICK_REPLIES.map((text) => (
            <button key={text} type="button" aria-pressed={message === text} onClick={() => setMessage(text)}>
              {text}
            </button>
          ))}
        </div>

        <label className={styles.field}>
          <span className="sr-only">Message about {listingTitle}</span>
          <textarea
            name="message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            maxLength={LIMITS.message}
            aria-invalid={!!fields.message || undefined}
            aria-describedby={describedBy("message")}
            required
          />
          {fieldError("message")}
        </label>

        <div className={styles.row}>
          <label className={styles.field}>
            <span className={styles.label}>Your name</span>
            <input
              name="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              maxLength={LIMITS.buyerName}
              aria-invalid={!!fields.name || undefined}
              aria-describedby={describedBy("name")}
              required
            />
            {fieldError("name")}
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Your email</span>
            <input
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              inputMode="email"
              aria-invalid={!!fields.email || undefined}
              aria-describedby={describedBy("email")}
              required
            />
            {fieldError("email")}
          </label>
        </div>

        {error && Object.keys(fields).length === 0 && (
          <p className={styles.formError} role="alert">
            {error}
          </p>
        )}

        <button type="submit" className={`btn btn-primary ${styles.send}`}>
          <PaperAirplaneIcon aria-hidden="true" />
          Send message
        </button>
        <p className={styles.note}>Only the seller sees your message and email.</p>
      </form>
    </section>
  );
}
