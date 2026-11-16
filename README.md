# Marketplace

A Facebook-style Marketplace. List something in a minute with a photo, browse by category or keyword, open any listing on its own page, message the seller, or buy it with Stripe.

Built with React, Next.js, Supabase (Postgres + Storage) and Stripe Connect. Deployed on Vercel.

**Live:** https://marketplace.jowiejurado.dev · **Portfolio:** https://www.jowiejurado.dev

## Features

**Required**

- **Create a listing:** photo, title, description, price, category, location and email, saved in Supabase
- **Choose a listing type** first, as in the mockup. Item for sale works today; Multiple listings, Vehicle for sale and Home for sale or rent are marked "Coming soon"
- **Browse:** every listing on the home page, newest first, with category tabs to filter
- **Listing page:** big photo, price, details, seller information and when it was listed
- **Message Seller:** the buyer's name, email and message are saved in Supabase

**Bonus**

- **Keyword search** across titles, descriptions and locations, within a category or across all of them
- **Email the seller** when a message arrives (via [Resend](https://resend.com)), with Reply-To set to the buyer

**Shopping experience**

- **Instant filtering and sorting:** category, price range, sort and search apply to what's already loaded the moment
  you pick them, while the server fetches the full result (optimistic filters with `useOptimistic`)
- **Debounced search:** results narrow as you type, and the server is asked once you pause (350 ms). Press `/` to search
- **Infinite scrolling:** 12 listings at a time, loaded before you reach the bottom, with a retry if a page fails and a
  clear end of the feed
- **Split-view listing modal:** opening a listing shows it over the feed (photo on one side, details and Message Seller
  on the other), so closing it returns you to the same scroll position. The URL is the listing's own, so refreshing or
  sharing it opens the full page (Next.js intercepting + parallel routes)
- **Optimistic updates:** a new listing appears at the top of the feed straight away and uploads in the background,
  with Try again if it fails. Messages show as sent immediately and roll back on error
- **Transitions** (React `<ViewTransition>`):
  - continuity: the card photo morphs into the listing view
  - drill: Sell something and Back slide in opposite directions while the header stays put
  - context: a new set of results crossfades in place
  - loading skeletons hand over to content with a short slide
- Grid and full-width list views, fixed 4:5 photo frames with shimmer placeholders so nothing jumps while images
  load, "New" and "Free" tags, and empty states that suggest what to try next
- Drag-and-drop photo upload with a live preview; big phone photos are resized in the browser before upload
- Quick-reply chips ("Is this still available?"); your name and email are remembered for next time
- Works on phones: categories become a scrolling chip row and the listing opens as a full-height sheet. Respects
  reduced-motion settings

## How it works

| File | What it does |
| --- | --- |
| `supabase/setup.sql` | Tables, security rules and the photo bucket. Safe to re-run |
| `supabase/seed.sql` | Optional sample listings (32, enough to see infinite scrolling) |
| `src/lib/shared.ts` | Filters, URL parsing, and the same filter and sort rules the database uses, for instant filtering |
| `src/lib/listings.ts` | Cached reads: a page of listings (category, price, search, sort), one listing, related, category counts |
| `src/app/actions.ts` | Server Actions: `loadListings` (next page), `createListing` and `messageSeller` (validate, save, email) |
| `src/lib/email.ts` | Sends the seller an email through Resend |
| `src/app/page.tsx` | Home: filters, toolbar and the feed |
| `src/components/Feed.tsx` | Filter panel, toolbar and the infinite feed |
| `src/components/MarketProvider.tsx` | Optimistic filters, listings being published, toasts |
| `src/app/@modal/(.)listings/[id]/page.tsx` | The listing modal over the feed |
| `src/app/listings/[id]/page.tsx` | The listing's own page (direct links and refreshes) |
| `src/components/ListingView.tsx` | Split view shared by the modal and the page |
| `src/components/CreateListingForm.tsx` | Create form with photo upload and live preview |
| `src/components/MessageSeller.tsx` | Message form on each listing |

Data is read on the server with Next.js Cache Components (`"use cache"` + `cacheTag("listings")`).
Publishing a listing calls `updateTag("listings")`, so it shows up immediately.

### Security

There is no login, so the app uses Supabase's public anon key and Row Level Security does the protecting:

- **Listings:** anyone can read and create them; nobody can edit or delete them through the API. Visitors can't set
  `id` or `created_at`, so listings can't be backdated, and the database checks lengths, the price range, the
  category list, the email format and that photos come from this project's bucket.
- **Messages:** anyone can send one, but **nobody can read them back** through the API, so buyers' emails and
  messages are never public. (The sample schema in the brief let anyone read every message.) `seller_email` on a
  message is filled in by a database trigger from the listing, so it can't be spoofed.
- Hidden honeypot fields stop simple spam bots, and email content is HTML-escaped.

## Payments (Test 4: Stripe Connect)

| Step | What happens |
| --- | --- |
| **Connect with Stripe** (`/sell/payouts`, or **Get paid** in the header) | The seller enters the email on their listings. The server creates a connected account with Stripe's **Accounts v2** API (the seller gets their own Stripe dashboard; Stripe collects fees and covers losses, the standard setup for direct charges), saves `email → stripe_account_id` in the `sellers` table, and sends them to Stripe's hosted onboarding. On return, `/sell/payouts/return` reads the account from Stripe and saves `charges_enabled`. |
| **Buy now** | Shown on listings whose seller has `charges_enabled`, that aren't sold and cost at least $0.50. It opens Stripe Checkout. |
| **Pay the seller** | A **direct charge** on the seller's connected account (`stripeAccount`), with `application_fee_amount` = **10%** kept by the marketplace. |
| **Confirm** | `/api/stripe/webhook` verifies the Stripe signature, then on `checkout.session.completed` marks the order **paid** and the listing **Sold**. The success redirect (`/orders/confirm`) checks the session too, so the buyer sees the result even if the webhook is a few seconds behind. Both paths are idempotent. `account.updated` keeps sellers' status current. |

The order page (`/orders/[id]`) shows the item, total and how it was split between seller and marketplace.

**Where things live:** `src/app/payments.ts` (Connect with Stripe, Buy now), `src/lib/payments.ts` (sellers, orders,
confirmation), `src/app/api/stripe/webhook/route.ts`, `src/app/sell/payouts/*`, `src/app/orders/*`,
`supabase/setup.sql` section 5.

**Security:**

- `sellers` and `orders` have Row Level Security on and no public policies; only the server writes them, with the
  Supabase **service-role** key. Visitors can't mark a listing sold, read orders or attach a Stripe account through the API.
- The price, fee and seller account always come from the database on the server, never from the browser.
- **No double sales:** Buy now saves the order first, and a unique index allows only one open checkout (or sale)
  per listing, so a second buyer is turned away before paying. Checkout sessions expire after 31 minutes, and
  backing out (`/orders/cancel`) closes the session at Stripe and frees the item at once.
- **No duplicate sessions:** the order id is the idempotency key for creating the Checkout session, and is sent as
  `client_reference_id`, so a payment can always be traced back to its order.
- Webhook requests without a valid Stripe signature are rejected. Events for orders or accounts this app didn't
  create (the sandbox is shared) are ignored with a 200.
- As the brief allows, there is no login, so sellers are identified by email. That means anyone who knows a seller's
  email could start onboarding for it before they do; with accounts, the seller would sign in first.

### Payments set-up

1. Run `supabase/setup.sql` again (it's safe to re-run; it adds `sellers`, `orders`, a `status` on listings and the
   one-open-checkout-per-listing rule).
2. Add to `.env.local` and to Vercel:
   - `SUPABASE_SERVICE_ROLE_KEY` (Supabase → Project Settings → API → `service_role`; server-only)
   - `STRIPE_SECRET_KEY` and `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (the sandbox keys from the brief)
3. Deploy, then register the webhook against the **production** URL and save the secret it prints as
   `STRIPE_WEBHOOK_SECRET` (in `.env.local` and Vercel), then redeploy:

   ```bash
   node --env-file=.env.local scripts/create-webhook.mjs https://your-app.vercel.app
   ```

   Testing locally instead? `stripe listen --api-key $STRIPE_SECRET_KEY --forward-connect-to localhost:3000/api/stripe/webhook`
   prints a temporary secret to use while it runs.
4. Click **Get paid**, connect with the email on a listing and finish onboarding with
   [Stripe's test data](https://docs.stripe.com/connect/testing). That listing now shows **Buy now**.
5. Buy it with card `4242 4242 4242 4242`, any future date, any CVC and ZIP.

## Set up

1. Create a free project at [supabase.com](https://supabase.com) (the Wall's project works too).
2. In **SQL Editor**, run `supabase/setup.sql`, then optionally `supabase/seed.sql` for sample listings.
3. Copy `.env.example` to `.env.local` and add the **Project URL** and **anon public** key from **Project Settings → API**.
4. Optional: add a `RESEND_API_KEY` to email sellers. Until you verify a domain in Resend, it only delivers to your own Resend account email.

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Deploy on Vercel

Import the repo, add the same environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
optionally `RESEND_API_KEY` and `EMAIL_FROM`, and the payment keys above), and click **Deploy**. Without the payment
keys the site still works; Buy now is simply hidden.
