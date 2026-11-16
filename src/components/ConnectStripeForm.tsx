"use client";

import { ArrowTopRightOnSquareIcon, CheckIcon } from "@heroicons/react/24/outline";
import { useEffect, useId, useState, type FormEvent } from "react";
import { connectWithStripe } from "@/app/payments";
import { isEmail } from "@/lib/shared";
import { SELLER_KEY } from "./CreateListingForm";
import styles from "./ConnectStripeForm.module.css";

type State = { kind: "idle" } | { kind: "busy" } | { kind: "ready"; email: string } | { kind: "error"; message: string };

/** Seller enters the email on their listings and goes to Stripe's hosted onboarding. */
export function ConnectStripeForm({ disabled }: { disabled?: boolean }) {
  const [email, setEmail] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [state, setState] = useState<State>({ kind: "idle" });
  const ids = useId();

  // The email they listed with last time is the one that matters.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(SELLER_KEY);
      if (saved) setEmail(saved); // eslint-disable-line react-hooks/set-state-in-effect -- restoring a saved value
    } catch {
      // Storage blocked.
    }
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isEmail(email.trim())) {
      setFieldError("Enter the email you used on your listings.");
      return;
    }
    setFieldError(null);
    setState({ kind: "busy" });

    const result = await connectWithStripe(new FormData(event.currentTarget));
    if (!result.ok) {
      setFieldError(result.fields?.email ?? null);
      setState({ kind: "error", message: result.error });
      return;
    }
    try {
      localStorage.setItem(SELLER_KEY, email.trim());
    } catch {
      // Not remembered.
    }
    if ("url" in result.data) {
      // Off to Stripe. Keep the busy state: the page is about to change.
      window.location.assign(result.data.url);
      return;
    }
    setState({ kind: "ready", email: result.data.email });
  }

  if (state.kind === "ready") {
    return (
      <div className={styles.ready} role="status">
        <CheckIcon aria-hidden="true" />
        <p>
          <strong>{state.email}</strong> is already connected. Your listings show a Buy Now button.
        </p>
      </div>
    );
  }

  const busy = state.kind === "busy";

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className={styles.honeypot} aria-hidden="true" />
      <label className={styles.field}>
        <span className={styles.label}>Email on your listings</span>
        <input
          name="email"
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setFieldError(null);
          }}
          autoComplete="email"
          inputMode="email"
          placeholder="you@example.com"
          disabled={disabled || busy}
          aria-invalid={fieldError ? true : undefined}
          aria-describedby={fieldError ? `${ids}-error` : undefined}
        />
        {fieldError && (
          <span className={styles.error} id={`${ids}-error`}>
            {fieldError}
          </span>
        )}
      </label>

      {state.kind === "error" && !fieldError && (
        <p className={styles.formError} role="alert">
          {state.message}
        </p>
      )}

      <button type="submit" className={`btn btn-primary ${styles.submit}`} disabled={disabled || busy}>
        {busy ? <span className={styles.spinner} aria-hidden="true" /> : <ArrowTopRightOnSquareIcon aria-hidden="true" />}
        {busy ? "Opening Stripe…" : "Connect with Stripe"}
      </button>
    </form>
  );
}
