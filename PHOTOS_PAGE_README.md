# Photos Page (Hybrid: GitHub Pages + Vercel API)

The photos page shows your Google Photos albums in a gallery on your site. Your **site** stays on GitHub Pages; a **Vercel serverless function** fetches photos from the Google Photos API using a **refresh token** (no manual token updates).

## How it works

- **Your domain** (e.g. haleyandty.com) → GitHub Pages (all HTML, CSS, JS).
- **Photos page** loads; JavaScript calls your **Vercel API** (`/api/get-photos-by-share-link?shareLinkId=...`).
- The API uses your **refresh token** to get a fresh access token from Google, then calls the Photos Library API and returns image URLs. The page renders them in a masonry grid with a full-screen viewer.

## Setup (one-time)

### 1. Deploy the API to Vercel

1. Push this repo to GitHub (if it isn’t already).
2. Go to [vercel.com](https://vercel.com) → **Add New Project** → import this repo.
3. Deploy. Note the deployment URL (e.g. `https://haleyandty.vercel.app`).

### 2. Get refresh token + OAuth credentials

1. [Google Cloud Console](https://console.cloud.google.com/) → your project → **APIs & Services** → **Library** → enable **Google Photos Library API**.
2. **Credentials** → your **OAuth 2.0 Client ID** (Web application). Copy **Client ID** and **Client secret**.
3. Open [OAuth 2.0 Playground](https://developers.google.com/oauthplayground/). Click the **gear** → **Use your own OAuth credentials** → paste Client ID and Client secret.
4. Set **Access type: Offline** in the config (so you get a refresh token).
5. Under “Input your own OAuth scopes”, enter: `https://www.googleapis.com/auth/photoslibrary.readonly`
6. Click **Authorize APIs** → sign in with the Google account that owns the albums → allow.
7. Click **Exchange authorization code for tokens**. Copy the **Refresh token** (long string, does *not* start with `ya29.`).

### 3. Add environment variables in Vercel

1. Vercel Dashboard → your project → **Settings** → **Environment Variables**.
2. Add these three (for Production and Preview if you want):

   | Name | Value |
   |------|--------|
   | `GOOGLE_PHOTOS_REFRESH_TOKEN` | The refresh token from step 2 |
   | `GOOGLE_PHOTOS_CLIENT_ID` | Your OAuth Client ID |
   | `GOOGLE_PHOTOS_CLIENT_SECRET` | Your OAuth Client secret |

3. **Redeploy** the project so the new variables are used.

You can remove `GOOGLE_PHOTOS_ACCESS_TOKEN` if you had it set; the function now uses the refresh token to get access tokens automatically.

### 4. Point the site at your API

In `js/google-photos.js`, set **VERCEL_API_BASE_URL** to your Vercel URL (e.g. `https://haleyandty.vercel.app`). Commit and push so your GitHub Pages site calls this API when visitors open the photos page.

## Summary

| What              | Where                |
|-------------------|----------------------|
| Live site & domain| GitHub Pages         |
| Photos API        | Vercel (serverless)  |
| Config            | `js/google-photos.js` (album IDs + Vercel URL) |
| Token             | Refresh token in Vercel env; access token is fetched automatically |

No manual token updates: the API uses the refresh token to get a new access token whenever it needs to call Google.
