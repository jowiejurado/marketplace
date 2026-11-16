# Marketplace

A Facebook-style Marketplace. List something in a minute with a photo, browse by category or keyword, open any listing on its own page, and message the seller.

Built with React, Next.js and Supabase (Postgres + Storage). Deployed on Vercel.

**Live:** _add your Vercel URL here_ · **Portfolio:** https://www.jowiejurado.dev

## Features

**Required**

- **Create a listing:** photo, title, description, price, category, location and email, saved in Supabase
- **Choose a listing type** first, as in the mockup: Item for sale, Multiple listings (up to 10 photos, one listing each, published together), Vehicle for sale (year, make, model and mileage build the title) and Home for sale or rent (sale/rent, type, bedrooms, bathrooms)
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
and optionally `RESEND_API_KEY` and `EMAIL_FROM`), and click **Deploy**.
