// Registers this app's webhook with Stripe (run once, after deploying):
//   node --env-file=.env.local scripts/create-webhook.mjs https://your-app.vercel.app
// Copy the printed signing secret into STRIPE_WEBHOOK_SECRET (in .env.local and Vercel), then redeploy.
import Stripe from "stripe";

const site = process.argv[2]?.replace(/\/$/, "");
if (!site || !site.startsWith("https://")) {
  console.error("Usage: node --env-file=.env.local scripts/create-webhook.mjs https://your-app.vercel.app");
  process.exit(1);
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const endpoint = await stripe.webhookEndpoints.create({
  url: `${site}/api/stripe/webhook`,
  // Payments are direct charges on sellers' connected accounts, so their events need a Connect endpoint.
  connect: true,
  enabled_events: ["checkout.session.completed", "checkout.session.async_payment_succeeded", "account.updated"],
});

console.log("Webhook:", endpoint.url);
console.log("Signing secret (shown once):", endpoint.secret);
