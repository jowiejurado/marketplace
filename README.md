# Marketplace

A Facebook-style Marketplace. List something in a minute with a photo, browse by category or keyword, open any listing on its own page, and message the seller.

Built with React, Next.js and Supabase (Postgres + Storage). Deployed on Vercel.

**Live:** _add your Vercel URL here_ · **Portfolio:** https://www.jowiejurado.dev

## Features

**Required**

- **Create a listing:** photo, title, description, price, category, location and email, saved in Supabase
- **Browse:** every listing on the home page, newest first, with category tabs to filter
- **Listing page:** big photo, price, details, seller information and when it was listed
- **Message Seller:** the buyer's name, email and message are saved in Supabase

**Bonus**

- **Keyword search** across titles, descriptions and locations, within a category or across all of them
- **Email the seller** when a message arrives (via [Resend](https://resend.com)), with Reply-To set to the buyer
- Grid and list views, "More in this category" on each listing, and a live preview while you create a listing

**Easier to use**

- Drag-and-drop photo upload; big phone photos are resized in the browser before upload
- Form checks happen as you go, with a clear message on each field, and the server checks everything again
- Quick-reply chips ("Is this still available?"); your name and email are remembered for next time
- Loading skeletons, empty states, a friendly 404, and it works on phones (categories become a scrolling chip row)

## How it works

| File | What it does |
| --- | --- |
| `supabase/setup.sql` | Tables, security rules and the photo bucket. Safe to re-run |
| `supabase/seed.sql` | Optional sample listings |
| `src/lib/listings.ts` | Cached reads: listings (with category and search filters), one listing, related, category counts |
| `src/app/actions.ts` | Server Actions: `createListing` and `messageSeller` (validate, save, email) |
| `src/lib/email.ts` | Sends the seller an email through Resend |
| `src/app/page.tsx` | Home: category sidebar or chips, search results, grid/list view |
| `src/app/listings/[id]/page.tsx` | Listing page |
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
