import "server-only";
import type { Listing } from "./shared";

type BuyerMessage = { buyerName: string; buyerEmail: string; message: string };

const escape = (text: string) =>
  text.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/**
 * Emails the seller through Resend (bonus feature). Returns false when email
 * isn't configured or fails; the message is already saved either way.
 */
export async function emailSeller(listing: Listing, msg: BuyerMessage, listingUrl: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return false;

  const html = `
    <div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.5;color:#172033">
      <p><strong>${escape(msg.buyerName)}</strong> sent you a message about <strong>${escape(listing.title)}</strong>:</p>
      <blockquote style="margin:16px 0;padding:12px 16px;border-left:3px solid #2f5bea;background:#f3f5fa">${escape(msg.message).replace(/\n/g, "<br>")}</blockquote>
      <p>Reply to this email to answer ${escape(msg.buyerName)} at ${escape(msg.buyerEmail)}.</p>
      <p><a href="${listingUrl}">View your listing</a></p>
    </div>`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || "Marketplace <onboarding@resend.dev>",
        to: [listing.seller_email],
        reply_to: msg.buyerEmail,
        subject: `New message about "${listing.title}"`,
        html,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
