"use client";

import { ChatBubbleLeftEllipsisIcon, CheckCircleIcon, PaperAirplaneIcon } from "@heroicons/react/24/outline";
import { useEffect, useId, useState, type FormEvent } from "react";
import { messageSeller, type FieldErrors } from "@/app/actions";
import { LIMITS } from "@/lib/shared";
import styles from "./MessageSeller.module.css";

const QUICK_REPLIES = ["Is this still available?", "Is the price negotiable?", "When can I pick it up?"];
const BUYER_KEY = "marketplace-buyer";

type Status = { kind: "idle" } | { kind: "sending" } | { kind: "sent"; emailed: boolean } | { kind: "error"; message: string };

export function MessageSeller({ listingId, listingTitle }: { listingId: string; listingTitle: string }) {
  const [message, setMessage] = useState("Hi, is this still available?");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [fields, setFields] = useState<FieldErrors>({});
  const [status, setStatus] = useState<Status>({ kind: "idle" });
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus({ kind: "sending" });
    setFields({});

    const result = await messageSeller(new FormData(event.currentTarget));
    if (!result.ok) {
      setFields(result.fields ?? {});
      setStatus({ kind: "error", message: result.error });
      return;
    }
    try {
      localStorage.setItem(BUYER_KEY, JSON.stringify({ name: name.trim(), email: email.trim() }));
    } catch {
      // Not remembered; the message still sent.
    }
    setStatus({ kind: "sent", emailed: result.data.emailed });
  }

  if (status.kind === "sent") {
    return (
      <section className={`${styles.card} ${styles.sent}`} role="status">
        <CheckCircleIcon className={styles.sentIcon} aria-hidden="true" />
        <h2>Message sent!</h2>
        <p>
          {status.emailed
            ? "We emailed the seller too. They’ll reply to "
            : "The seller will get back to you at "}
          <strong>{email}</strong>.
        </p>
        <button
          type="button"
          className={styles.secondary}
          onClick={() => {
            setMessage("");
            setStatus({ kind: "idle" });
          }}
        >
          Send another message
        </button>
      </section>
    );
  }

  const sending = status.kind === "sending";
  const error = (name: string) => fields[name] && <p className={styles.fieldError} id={`${ids}-${name}-error`}>{fields[name]}</p>;
  const describedBy = (name: string) => (fields[name] ? `${ids}-${name}-error` : undefined);

  return (
    <section className={styles.card} aria-labelledby={`${ids}-heading`}>
      <h2 id={`${ids}-heading`} className={styles.heading}>
        <ChatBubbleLeftEllipsisIcon aria-hidden="true" />
        Send seller a message
      </h2>

      <form onSubmit={handleSubmit} className={styles.form} noValidate>
        <input type="hidden" name="listing_id" value={listingId} />
        {/* Honeypot: hidden from people, tempting to bots. */}
        <input type="text" name="website" tabIndex={-1} autoComplete="off" className={styles.honeypot} aria-hidden="true" />

        <div className={styles.quick} role="group" aria-label="Quick messages">
          {QUICK_REPLIES.map((text) => (
            <button
              key={text}
              type="button"
              aria-pressed={message === text}
              onClick={() => setMessage(text)}
            >
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
          {error("message")}
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
            {error("name")}
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
            {error("email")}
          </label>
        </div>

        {status.kind === "error" && !Object.keys(fields).length && (
          <p className={styles.formError} role="alert">
            {status.message}
          </p>
        )}

        <button type="submit" className={styles.send} disabled={sending}>
          {sending ? <span className={styles.spinner} aria-hidden="true" /> : <PaperAirplaneIcon aria-hidden="true" />}
          {sending ? "Sending…" : "Message seller"}
        </button>
        <p className={styles.note}>Only the seller sees your message and email.</p>
      </form>
    </section>
  );
}
