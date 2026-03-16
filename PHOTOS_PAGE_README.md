# Photos Page (Hybrid: GitHub Pages + Vercel Scraper API)

The photos page shows your Google Photos albums in a gallery on your site. Your **site** stays on GitHub Pages; a **Vercel serverless function** scrapes the public shared album pages and returns photo URLs. No OAuth, API keys, or Google Cloud project needed.

## How it works

- **Your domain** (e.g. haleyandty.com) → GitHub Pages (all HTML, CSS, JS).
- **Photos page** loads; JavaScript calls your **Vercel API** (`/api/get-photos-by-share-link?shareLinkId=...`).
- The API fetches the public Google Photos shared album page, extracts image URLs, and returns them as JSON. The page renders them in a masonry grid with a full-screen viewer.
- Results are cached server-side for 1 hour and client-side in localStorage for 1 hour.

## Setup (one-time)

### 1. Deploy the API to Vercel

1. Push this repo to GitHub (if it isn't already).
2. Go to [vercel.com](https://vercel.com) → **Add New Project** → import this repo.
3. Deploy. Note the deployment URL (e.g. `https://haleyandty.vercel.app`).

No environment variables are needed.

### 2. Point the site at your API

In `js/google-photos.js`, set **VERCEL_API_BASE_URL** to your Vercel URL (e.g. `https://haleyandty.vercel.app`). Commit and push so your GitHub Pages site calls this API when visitors open the photos page.

### 3. Configure albums

In `js/google-photos.js`, each tab maps to a `shareLinkId` extracted from your Google Photos share links. For example, `https://photos.app.goo.gl/zMvGzMNd4BvJYdok7` has a shareLinkId of `zMvGzMNd4BvJYdok7`. These are already configured.

## Summary

| What              | Where                |
|-------------------|----------------------|
| Live site & domain| GitHub Pages         |
| Photos API        | Vercel (serverless)  |
| Config            | `js/google-photos.js` (share link IDs + Vercel URL) |
| Auth needed       | None                 |

Albums must be shared (have a public share link) for the scraper to access them.
