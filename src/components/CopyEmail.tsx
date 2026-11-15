"use client";

import { CheckIcon, DocumentDuplicateIcon } from "@heroicons/react/24/outline";
import { useState } from "react";
import styles from "./MessageSeller.module.css";

export function CopyEmail({ email }: { email: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard blocked; the mailto link still works.
    }
  }

  return (
    <span className={styles.email}>
      <a href={`mailto:${email}`}>{email}</a>
      <button type="button" onClick={copy} aria-label={copied ? "Email copied" : "Copy email"} title="Copy email">
        {copied ? <CheckIcon aria-hidden="true" /> : <DocumentDuplicateIcon aria-hidden="true" />}
      </button>
    </span>
  );
}
